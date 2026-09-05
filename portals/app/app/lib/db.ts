import type { PrismaClient } from "@prisma/client";

// Prisma client singleton with the pg driver adapter (Prisma 7, Rust-free). The
// import is DYNAMIC so the offline/in-memory path never loads @prisma/client -
// only a DATABASE_URL-configured runtime pulls it in. The DDL owns structure;
// Prisma is the client only and never migrates (no migrations dir).

let clientPromise: Promise<PrismaClient> | null = null;

export function prismaEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function getPrismaClient(): Promise<PrismaClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { PrismaClient } = await import("@prisma/client");
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
      return new PrismaClient({ adapter });
    })();
  }
  return clientPromise;
}
