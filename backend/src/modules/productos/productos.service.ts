import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../utils/http-error';
import {
  IVA,
  type ActualizarProductoInput,
  type CrearProductoInput,
  type ListarProductosInput,
  type NuevoPrecioInput,
} from './productos.schemas';

// Redondeo a 2 decimales para montos calculados
const round2 = (n: number) => Math.round(n * 100) / 100;

// Stock actual por producto, derivado del kardex (vista v_stock_actual / DBD-01 §4.1)
async function stockPorProducto(ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();
  const sumas = await prisma.movimientoStock.groupBy({
    by: ['productoId'],
    where: { productoId: { in: ids } },
    _sum: { cantidad: true },
  });
  return new Map(sumas.map((s) => [s.productoId, Number(s._sum.cantidad ?? 0)]));
}

// Precio vigente por producto (vigente_hasta IS NULL)
async function preciosVigentes(ids: number[]) {
  if (ids.length === 0) return new Map<number, { neto: number; bruto: number }>();
  const precios = await prisma.precioProducto.findMany({
    where: { productoId: { in: ids }, vigenteHasta: null },
  });
  return new Map(
    precios.map((p) => [
      p.productoId,
      { neto: Number(p.precioNeto), bruto: Number(p.precioBruto) },
    ]),
  );
}

// RF-08: búsqueda y filtros con paginación
export async function listar(input: ListarProductosInput) {
  const where: Prisma.ProductoWhereInput = {
    ...(input.incluirInactivos ? {} : { activo: true }),
    ...(input.categoriaId ? { categoriaId: input.categoriaId } : {}),
    ...(input.buscar
      ? {
          OR: [
            { nombre: { contains: input.buscar, mode: 'insensitive' } },
            { codigo: { contains: input.buscar, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, productos] = await prisma.$transaction([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: { nombre: 'asc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  const ids = productos.map((p) => p.id);
  const [stocks, precios] = await Promise.all([stockPorProducto(ids), preciosVigentes(ids)]);

  const data = productos.map((p) => {
    const stockActual = stocks.get(p.id) ?? 0;
    const stockMinimo = Number(p.stockMinimo);
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoria,
      unidadMedida: p.unidadMedida,
      dimensiones: p.dimensiones,
      stockMinimo,
      stockActual,
      bajoMinimo: stockActual < stockMinimo, // RN-06 (indicador)
      precioVigente: precios.get(p.id) ?? null,
      activo: p.activo,
    };
  });

  return { data, meta: { total, page: input.page, pageSize: input.pageSize } };
}

export async function obtener(id: number) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: { categoria: { select: { id: true, nombre: true } } },
  });
  if (!producto) throw HttpError.notFound('Producto no encontrado');

  const [stocks, precios] = await Promise.all([
    stockPorProducto([id]),
    preciosVigentes([id]),
  ]);
  const stockActual = stocks.get(id) ?? 0;
  const stockMinimo = Number(producto.stockMinimo);

  return {
    id: producto.id,
    codigo: producto.codigo,
    nombre: producto.nombre,
    categoria: producto.categoria,
    unidadMedida: producto.unidadMedida,
    dimensiones: producto.dimensiones,
    stockMinimo,
    stockActual,
    bajoMinimo: stockActual < stockMinimo,
    precioVigente: precios.get(id) ?? null,
    activo: producto.activo,
  };
}

// RF-07: historial de cambios de precio
export async function historialPrecios(productoId: number) {
  const producto = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!producto) throw HttpError.notFound('Producto no encontrado');

  const precios = await prisma.precioProducto.findMany({
    where: { productoId },
    orderBy: { vigenteDesde: 'desc' },
  });
  return precios.map((p) => ({
    id: p.id,
    precioNeto: Number(p.precioNeto),
    precioBruto: Number(p.precioBruto),
    vigenteDesde: p.vigenteDesde,
    vigenteHasta: p.vigenteHasta,
    vigente: p.vigenteHasta === null,
  }));
}

// RF-05: crear producto (con precio inicial opcional)
export async function crear(input: CrearProductoInput) {
  const [conCodigo, categoria] = await Promise.all([
    prisma.producto.findUnique({ where: { codigo: input.codigo } }),
    prisma.categoria.findUnique({ where: { id: input.categoriaId } }),
  ]);
  if (conCodigo) throw HttpError.conflict('Ya existe un producto con ese código');
  if (!categoria || !categoria.activo)
    throw HttpError.badRequest('La categoría indicada no existe o está inactiva'); // RN-03

  return prisma.$transaction(async (tx) => {
    const producto = await tx.producto.create({
      data: {
        codigo: input.codigo,
        nombre: input.nombre,
        categoriaId: input.categoriaId,
        unidadMedida: input.unidadMedida,
        dimensiones: input.dimensiones,
        stockMinimo: input.stockMinimo,
      },
    });
    if (input.precioNeto) {
      await tx.precioProducto.create({
        data: {
          productoId: producto.id,
          precioNeto: input.precioNeto,
          precioBruto: input.precioBruto ?? round2(input.precioNeto * (1 + IVA)),
          vigenteDesde: new Date(),
        },
      });
    }
    return producto;
  });
}

export async function actualizar(id: number, input: ActualizarProductoInput) {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw HttpError.notFound('Producto no encontrado');

  if (input.codigo && input.codigo !== producto.codigo) {
    const conCodigo = await prisma.producto.findUnique({ where: { codigo: input.codigo } });
    if (conCodigo) throw HttpError.conflict('Ya existe un producto con ese código');
  }
  if (input.categoriaId) {
    const categoria = await prisma.categoria.findUnique({ where: { id: input.categoriaId } });
    if (!categoria || !categoria.activo)
      throw HttpError.badRequest('La categoría indicada no existe o está inactiva');
  }
  return prisma.producto.update({ where: { id }, data: input });
}

export async function cambiarEstado(id: number, activo: boolean) {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) throw HttpError.notFound('Producto no encontrado');
  return prisma.producto.update({ where: { id }, data: { activo } });
}

// RF-07: registrar nuevo precio → cierra el vigente y abre el nuevo (transacción).
// El índice parcial uq_precio_vigente en BD garantiza un único precio vigente.
export async function nuevoPrecio(productoId: number, input: NuevoPrecioInput) {
  const producto = await prisma.producto.findUnique({ where: { id: productoId } });
  if (!producto) throw HttpError.notFound('Producto no encontrado');

  const vigenteDesde = input.vigenteDesde ?? new Date();
  const precioBruto = input.precioBruto ?? round2(input.precioNeto * (1 + IVA));

  return prisma.$transaction(async (tx) => {
    const vigente = await tx.precioProducto.findFirst({
      where: { productoId, vigenteHasta: null },
    });

    if (vigente) {
      if (vigenteDesde < vigente.vigenteDesde) {
        throw HttpError.conflict(
          'La fecha de vigencia no puede ser anterior al inicio del precio vigente actual',
        );
      }
      await tx.precioProducto.update({
        where: { id: vigente.id },
        data: { vigenteHasta: vigenteDesde },
      });
    }

    return tx.precioProducto.create({
      data: { productoId, precioNeto: input.precioNeto, precioBruto, vigenteDesde },
    });
  });
}
