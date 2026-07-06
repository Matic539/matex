import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Cliente Prisma singleton (evita agotar conexiones con hot-reload de tsx)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
