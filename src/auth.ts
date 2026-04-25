import NextAuth from "next-auth";
import { headers } from "next/headers";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAdminAuthVersion } from "@/lib/admin-auth-version";
import {
    clearAdminLoginFailures,
    getAdminLoginRateLimitKeys,
    getAdminLoginRateLimitState,
    recordAdminLoginFailure,
} from "@/lib/admin-login-rate-limit";
import { isAdminEmail } from "@/lib/admin-auth";
import {
    isAdminCredentialSetupComplete,
    verifyAdminCredentials,
} from "@/lib/admin-credentials";

const providers = [
    CredentialsProvider({
        id: "admin-credentials",
        name: "Admin Credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            // env 미완료면 rate counter 소모 없이 즉시 실패
            if (!isAdminCredentialSetupComplete()) {
                return null;
            }

            const headerStore = await headers();
            const forwardedFor = headerStore.get("x-forwarded-for");
            const realIp = headerStore.get("x-real-ip");
            const ip =
                forwardedFor?.split(",")[0]?.trim() ||
                realIp?.trim() ||
                "unknown";
            const email =
                typeof credentials?.email === "string"
                    ? credentials.email
                    : undefined;
            const password =
                typeof credentials?.password === "string"
                    ? credentials.password
                    : undefined;

            if (!email || !password) {
                return null;
            }

            const rateLimitKeys = getAdminLoginRateLimitKeys(ip, email);
            for (const key of rateLimitKeys) {
                const state = await getAdminLoginRateLimitState(key);
                if (state.blocked) return null;
            }

            if (!verifyAdminCredentials(email, password)) {
                await Promise.all(
                    rateLimitKeys.map((key) => recordAdminLoginFailure(key))
                );
                return null;
            }

            await Promise.all(
                rateLimitKeys.map((key) => clearAdminLoginFailures(key))
            );
            return {
                id: "admin-user",
                email,
                name: "Admin",
            };
        },
    }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    pages: {
        signIn: "/admin/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 4,
        updateAge: 60 * 30,
    },
    providers,
    callbacks: {
        async signIn({ account, user }) {
            if (account?.provider !== "admin-credentials") return false;
            if (!isAdminEmail(user?.email)) return false;
            return true;
        },
        async jwt({ token, user, account }) {
            const authVersion = getAdminAuthVersion();
            const nextEmail =
                typeof user?.email === "string" ? user.email : token.email;
            token.email = nextEmail;
            if (account?.provider) {
                token.authProvider = account.provider;
            }
            if (account?.provider === "admin-credentials") {
                token.adminAuthVersion = authVersion;
            }
            token.isAdmin =
                token.authProvider === "admin-credentials" &&
                token.adminAuthVersion === authVersion;
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = String(token.sub ?? "");
                session.user.isAdmin = token.isAdmin === true;
            }
            return session;
        },
    },
});
