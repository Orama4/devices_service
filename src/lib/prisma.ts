
import { PrismaClient } from "@prisma/client";

// Extend the NodeJS global type to include Prisma
declare global {
  var prisma: PrismaClient | undefined;
}

// Set the transaction timeout
process.env.PRISMA_CLIENT_TRANSACTION_MAX_TIMEOUT = "10000"; 

// Use the cached instance in development, or create a new one in production
export const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;