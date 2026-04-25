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
import { verifyAdminCredentials } from "@/lib/admin-credentials";

const providers = [
    CredentialsProvider({
        id: "admin-credentials",
        name: "Admin Credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
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
            if (
                rateLimitKeys.some(
                    (key) => getAdminLoginRateLimitState(key).blocked
                )
            ) {
                return null;
            }

            if (!verifyAdminCredentials(email, password)) {
                rateLimitKeys.forEach((key) => recordAdminLoginFailure(key));
                return null;
            }

            rateLimitKeys.forEach((key) => clearAdminLoginFailures(key));
            return {
                id: "admin-user",
                email,
                name: "Admin",
            };
        },
    }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret:
        process.env.NEXTAUTH_SECRET ||
        (process.env.NODE_ENV === "development"
            ? "local-dev-nextauth-secret"
            : undefined),
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
        async signIn({ account }) {
            return account?.provider === "admin-credentials";
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
