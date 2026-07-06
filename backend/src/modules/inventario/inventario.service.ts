import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import { validarMovimiento } from './inventario.logic';
import type { CrearMovimientoInput, ListarMovimientosInput } from './inventario.schemas';

async function stockActualDe(productoId: number, tx: Prisma.TransactionClient = prisma) {
  const suma = await tx.movimientoStock.aggregate({
    where: { productoId },
    _sum: { cantidad: true },
  });
  return Number(suma._sum.cantidad ?? 0);
}

// RF-09: registrar movimiento manual (entrada o ajuste) con RN-02
export async function crearMovimiento(input: CrearMovimientoInput, usuarioId: number) {
  const producto = await prisma.producto.findUnique({ where: { id: input.productoId } });
  if (!producto || !producto.activo)
    throw HttpError.badRequest('El producto no existe o está inactivo');

  if (input.proveedorId) {
    const proveedor = await prisma.proveedor.findUnique({ where: { id: input.proveedorId } });
    if (!proveedor || !proveedor.activo)
      throw HttpError.badRequest('El proveedor no existe o está inactivo');
  }

  return prisma.$transaction(async (tx) => {
    const stockActual = await stockActualDe(input.productoId, tx);
    const error = validarMovimiento({
      tipo: input.tipo,
      cantidad: input.cantidad,
      stockActual,
      observacion: input.observacion,
    });
    if (error) throw HttpError.conflict(error);

    const movimiento = await tx.movimientoStock.create({
      data: {
        productoId: input.productoId,
        tipo: input.tipo,
        cantidad: input.cantidad,
        proveedorId: input.proveedorId,
        usuarioId,
        observacion: input.observacion,
      },
    });
    return { ...movimiento, cantidad: Number(movimiento.cantidad), stockResultante: stockActual + input.cantidad };
  });
}

// RF-12: kardex (general o por producto), paginado
export async function listarMovimientos(input: ListarMovimientosInput) {
  const where: Prisma.MovimientoStockWhereInput = {
    ...(input.productoId ? { productoId: input.productoId } : {}),
    ...(input.tipo ? { tipo: input.tipo } : {}),
  };

  const [total, movimientos] = await prisma.$transaction([
    prisma.movimientoStock.count({ where }),
    prisma.movimientoStock.findMany({
      where,
      include: {
        producto: { select: { id: true, codigo: true, nombre: true, unidadMedida: true } },
        proveedor: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        ventaDetalle: { select: { ventaId: true } },
      },
      orderBy: { fecha: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  const data = movimientos.map((m) => ({
    id: m.id,
    fecha: m.fecha,
    tipo: m.tipo,
    cantidad: Number(m.cantidad),
    producto: m.producto,
    proveedor: m.proveedor,
    usuario: m.usuario,
    ventaId: m.ventaDetalle?.ventaId ?? null,
    observacion: m.observacion,
  }));

  return { data, meta: { total, page: input.page, pageSize: input.pageSize } };
}

// RF-11 / RN-06: productos con stock bajo el mínimo
export async function alertas() {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, nombre: true, unidadMedida: true, stockMinimo: true },
  });
  const sumas = await prisma.movimientoStock.groupBy({
    by: ['productoId'],
    _sum: { cantidad: true },
  });
  const stocks = new Map(sumas.map((s) => [s.productoId, Number(s._sum.cantidad ?? 0)]));

  return productos
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      unidadMedida: p.unidadMedida,
      stockMinimo: Number(p.stockMinimo),
      stockActual: stocks.get(p.id) ?? 0,
    }))
    .filter((p) => p.stockActual < p.stockMinimo)
    .sort((a, b) => a.stockActual - b.stockActual);
}
