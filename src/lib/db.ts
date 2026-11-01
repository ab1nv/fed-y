import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as { prisma?: InstanceType<typeof PrismaClient> };

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it in .env (see .env.example).`);
  return value;
}

function makeClient() {
  const adapter = new PrismaLibSql({
    url: required("TURSO_DATABASE_URL"),
    authToken: required("TURSO_AUTH_TOKEN"),
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
