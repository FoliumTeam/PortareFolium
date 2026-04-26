import type { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            isAdmin: boolean;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        isAdmin?: boolean;
        authProvider?: string;
        adminAuthVersion?: string;
    }
}
