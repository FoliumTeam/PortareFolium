import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import GoogleProvider from "next-auth/providers/google";
import { isAdminEmail } from "@/lib/admin-auth";

const providers: Provider[] = [];

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
        })
    );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    pages: {
        signIn: "/admin/login",
    },
    session: {
        strategy: "jwt",
    },
    providers,
    callbacks: {
        async signIn({ user }) {
            return isAdminEmail(user.email);
        },
        async jwt({ token, user }) {
            const nextEmail =
                typeof user?.email === "string" ? user.email : token.email;
            token.email = nextEmail;
            token.isAdmin = isAdminEmail(nextEmail);
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
