// Exportación CSV en el cliente (para reportes RF-25/26/27)

export function descargarCSV(
  nombreArchivo: string,
  columnas: { clave: string; titulo: string }[],
  filas: Record<string, unknown>[],
): void {
  const escapar = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const encabezado = columnas.map((c) => escapar(c.titulo)).join(';');
  const cuerpo = filas
    .map((f) => columnas.map((c) => escapar(f[c.clave])).join(';'))
    .join('\n');

  // BOM para que Excel (es-CL) abra el UTF-8 correctamente
  const blob = new Blob(['﻿' + encabezado + '\n' + cuerpo], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
