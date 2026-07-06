import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import { calcularTotales, validarStockVenta } from './ventas.logic';
import type { CrearVentaInput, ListarVentasInput } from './ventas.schemas';

// RF-13: registrar venta manual. Transacción atómica que crea la venta,
// sus detalles y los movimientos de stock (RN-01), validando RN-02.
export async function crear(input: CrearVentaInput, usuarioId: number) {
  const productoIds = [...new Set(input.items.map((i) => i.productoId))];

  const [productos, formaPago, sumas] = await Promise.all([
    prisma.producto.findMany({ where: { id: { in: productoIds } } }),
    prisma.formaPago.findUnique({ where: { id: input.formaPagoId } }),
    prisma.movimientoStock.groupBy({
      by: ['productoId'],
      where: { productoId: { in: productoIds } },
      _sum: { cantidad: true },
    }),
  ]);

  if (!formaPago) throw HttpError.badRequest('Forma de pago inválida');
  const inactivos = productoIds.filter(
    (id) => !productos.find((p) => p.id === id && p.activo),
  );
  if (inactivos.length > 0)
    throw HttpError.badRequest(`Productos inexistentes o inactivos: ${inactivos.join(', ')}`);

  // Precio vigente como valor por defecto cuando la línea no trae precio
  const vigentes = await prisma.precioProducto.findMany({
    where: { productoId: { in: productoIds }, vigenteHasta: null },
  });
  const precioPorProducto = new Map<number, number>(
    vigentes.map((p) => [p.productoId, Number(p.precioBruto)]),
  );

  const items = input.items.map((i) => {
    const precioUnitario = i.precioUnitario ?? precioPorProducto.get(i.productoId);
    if (!precioUnitario) {
      const producto = productos.find((p) => p.id === i.productoId);
      throw HttpError.badRequest(
        `El producto ${producto?.nombre ?? i.productoId} no tiene precio vigente; indique el precio manualmente`,
      );
    }
    return { productoId: i.productoId, cantidad: i.cantidad, precioUnitario };
  });

  // RN-02: validar stock disponible
  const stocks = new Map<number, number>(
    sumas.map((s) => [s.productoId, Number(s._sum.cantidad ?? 0)]),
  );
  const nombres = new Map<number, string>(productos.map((p) => [p.id, p.nombre]));
  const errores = validarStockVenta(items, stocks, nombres);
  if (errores.length > 0) throw HttpError.conflict(errores.join(' · '));

  const { detalles, total } = calcularTotales(items);

  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.create({
      data: {
        fecha: new Date(),
        usuarioId,
        formaPagoId: input.formaPagoId,
        estado: 'entregado',
        origen: 'manual',
        total,
      },
    });

    for (const d of detalles) {
      const detalle = await tx.ventaDetalle.create({
        data: {
          ventaId: venta.id,
          productoId: d.productoId,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
        },
      });
      // RN-01: descuento automático de stock (salida_venta, cantidad negativa)
      await tx.movimientoStock.create({
        data: {
          productoId: d.productoId,
          tipo: 'salida_venta',
          cantidad: -d.cantidad,
          ventaDetalleId: detalle.id,
          usuarioId,
        },
      });
    }

    return obtenerTx(venta.id, tx);
  });
}

// RF-15: consulta con filtros por fecha, categoría y origen
export async function listar(input: ListarVentasInput) {
  const where: Prisma.VentaWhereInput = {
    ...(input.desde || input.hasta
      ? {
          fecha: {
            ...(input.desde ? { gte: input.desde } : {}),
            ...(input.hasta ? { lte: finDeDia(input.hasta) } : {}),
          },
        }
      : {}),
    ...(input.origen ? { origen: input.origen } : {}),
    ...(input.categoriaId
      ? { detalles: { some: { producto: { categoriaId: input.categoriaId } } } }
      : {}),
  };

  const [total, ventas] = await prisma.$transaction([
    prisma.venta.count({ where }),
    prisma.venta.findMany({
      where,
      include: {
        formaPago: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
        _count: { select: { detalles: true } },
      },
      orderBy: { fecha: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  const data = ventas.map((v) => ({
    id: v.id,
    fecha: v.fecha,
    estado: v.estado,
    origen: v.origen,
    formaPago: v.formaPago.nombre,
    usuario: v.usuario?.nombre ?? null,
    nItems: v._count.detalles,
    total: Number(v.total),
  }));

  return { data, meta: { total, page: input.page, pageSize: input.pageSize } };
}

// RF-16: detalle de venta con sus productos
async function obtenerTx(id: number, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const venta = await tx.venta.findUnique({
    where: { id },
    include: {
      formaPago: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
      detalles: {
        include: {
          producto: { select: { id: true, codigo: true, nombre: true, unidadMedida: true } },
        },
      },
    },
  });
  if (!venta) throw HttpError.notFound('Venta no encontrada');

  return {
    id: venta.id,
    fecha: venta.fecha,
    estado: venta.estado,
    origen: venta.origen,
    formaPago: venta.formaPago.nombre,
    usuario: venta.usuario?.nombre ?? null,
    total: Number(venta.total),
    detalles: venta.detalles.map((d) => ({
      id: d.id,
      producto: d.producto,
      cantidad: Number(d.cantidad),
      precioUnitario: Number(d.precioUnitario),
      subtotal: Number(d.subtotal),
    })),
  };
}

export const obtener = (id: number) => obtenerTx(id);

export function formasPago() {
  return prisma.formaPago.findMany({ orderBy: { nombre: 'asc' } });
}

function finDeDia(d: Date): Date {
  const fin = new Date(d);
  fin.setHours(23, 59, 59, 999);
  return fin;
}
