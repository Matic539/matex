// Formateadores para la UI (es-CL)

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const formatCLP = (n: number) => clp.format(n);

export const formatFecha = (d: string | Date) =>
  new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatCantidad = (n: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(n);
