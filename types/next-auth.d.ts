import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      clubId: string;
      clubName: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    clubId: string;
    clubName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    clubId: string;
    clubName: string;
  }
}
