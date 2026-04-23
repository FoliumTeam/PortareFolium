import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { isAdminEmail } from "@/lib/admin-auth";
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

            if (!verifyAdminCredentials(email, password)) {
                return null;
            }

            return {
                id: "admin-user",
                email,
                name: "Admin",
            };
        },
    }),
];

if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    providers.push(
        CredentialsProvider({
            id: "e2e-credentials",
            name: "E2E Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email =
                    typeof credentials?.email === "string"
                        ? credentials.email
                        : undefined;
                const password =
                    typeof credentials?.password === "string"
                        ? credentials.password
                        : undefined;
                if (
                    email === process.env.E2E_EMAIL &&
                    password === process.env.E2E_PASSWORD
                ) {
                    return {
                        id: "e2e-admin",
                        email,
                        name: "E2E Admin",
                    };
                }
                return null;
            },
        })
    );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.NEXTAUTH_SECRET || "local-dev-nextauth-secret",
    trustHost: true,
    pages: {
        signIn: "/admin/login",
    },
    session: {
        strategy: "jwt",
    },
    providers,
    callbacks: {
        async signIn({ user, account }) {
            if (
                account?.provider === "e2e-credentials" ||
                account?.provider === "admin-credentials"
            ) {
                return true;
            }
            return isAdminEmail(user.email);
        },
        async jwt({ token, user, account }) {
            const nextEmail =
                typeof user?.email === "string" ? user.email : token.email;
            token.email = nextEmail;
            if (account?.provider) {
                token.authProvider = account.provider;
            }
            token.isAdmin =
                token.authProvider === "e2e-credentials" ||
                token.authProvider === "admin-credentials"
                    ? true
                    : isAdminEmail(nextEmail);
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
