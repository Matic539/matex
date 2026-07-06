// Seed de usuarios demo (Fase 0, tarea 0.5 de PDP-01).
// Idempotente: si el email ya existe no lo modifica (compatible con el
// admin creado por sql/05_seed.sql vía pgcrypto — hash $2a$ compatible con bcryptjs).
// Ejecutar: npm run seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Matex.2026-cambiar';

const usuariosDemo = [
  { nombre: 'Administrador Matex', email: 'admin@matex.cl', rol: 'admin' },
  { nombre: 'Operador de Ventas (demo)', email: 'ventas@matex.cl', rol: 'ventas' },
  { nombre: 'Encargado de Bodega (demo)', email: 'bodega@matex.cl', rol: 'inventario' },
] as const;

const formasPagoBase = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];

async function main() {
  // Formas de pago mínimas para venta manual (idempotente; el ETL puede haber creado otras)
  for (const nombre of formasPagoBase) {
    await prisma.formaPago.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }
  console.log(`✅ Formas de pago verificadas: ${formasPagoBase.join(', ')}`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const u of usuariosDemo) {
    const existente = await prisma.usuario.findUnique({ where: { email: u.email } });
    if (existente) {
      console.log(`↷ ${u.email} ya existe (id ${existente.id}), sin cambios`);
      continue;
    }
    const creado = await prisma.usuario.create({
      data: { ...u, passwordHash },
    });
    console.log(`✅ ${u.email} creado (id ${creado.id}, rol ${u.rol})`);
  }

  console.log('\nSeed completado. Contraseña demo: la definida en SEED_DEMO_PASSWORD.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
