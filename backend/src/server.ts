import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`✅ API Matex escuchando en http://localhost:${env.PORT}/api/v1`);
});

// Cierre limpio (Ctrl+C / kill): cerrar HTTP y desconectar Prisma
async function shutdown(signal: string) {
  console.log(`\n${signal} recibido, cerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
