import { describe, expect, it } from 'vitest';
import {
  debeReponer,
  decidirFuente,
  nivelConfianza,
  sugerenciaReposicion,
} from '../src/modules/predicciones/predicciones.logic';

describe('nivelConfianza (RP3-01 §3)', () => {
  it('clasifica según MAPE acumulado', () => {
    expect(nivelConfianza(21.9)).toBe('alta');
    expect(nivelConfianza(56.1)).toBe('media');
    expect(nivelConfianza(137)).toBe('baja');
  });
  it('sin métrica ⇒ sin_modelo', () => {
    expect(nivelConfianza(null)).toBe('sin_modelo');
    expect(nivelConfianza(undefined)).toBe('sin_modelo');
  });
});

describe('sugerenciaReposicion (RF-23)', () => {
  it('cubre demanda del lead time sin perforar stock mínimo', () => {
    expect(
      sugerenciaReposicion({ stockActual: 50, stockMinimo: 20, demandaPrevistaLeadTime: 40 }),
    ).toBe(10);
  });
  it('no sugiere negativo con stock holgado', () => {
    expect(
      sugerenciaReposicion({ stockActual: 500, stockMinimo: 20, demandaPrevistaLeadTime: 40 }),
    ).toBe(0);
  });
  it('redondea hacia arriba (no se compra media plancha)', () => {
    expect(
      sugerenciaReposicion({ stockActual: 0, stockMinimo: 0, demandaPrevistaLeadTime: 10.2 }),
    ).toBe(11);
  });
});

describe('debeReponer (política RP4-01 §3: fecha pesimista vs lead time)', () => {
  const hoy = new Date('2026-08-20');

  it('alerta si el quiebre pesimista cae dentro del lead time', () => {
    expect(
      debeReponer({
        confianza: 'alta',
        fechaQuiebrePesimista: new Date('2026-09-01'),
        leadTimeDias: 21,
        stockActual: 100,
        stockMinimo: 10,
        hoy,
      }),
    ).toBe(true);
  });

  it('no alerta si el stock cubre todo el horizonte', () => {
    expect(
      debeReponer({
        confianza: 'alta',
        fechaQuiebrePesimista: null,
        leadTimeDias: 21,
        stockActual: 100,
        stockMinimo: 10,
        hoy,
      }),
    ).toBe(false);
  });

  it('con confianza baja usa la regla clásica de stock mínimo', () => {
    expect(
      debeReponer({
        confianza: 'baja',
        fechaQuiebrePesimista: new Date('2026-08-25'),
        leadTimeDias: 21,
        stockActual: 5,
        stockMinimo: 10,
        hoy,
      }),
    ).toBe(true);
    expect(
      debeReponer({
        confianza: 'sin_modelo',
        fechaQuiebrePesimista: null,
        leadTimeDias: 21,
        stockActual: 50,
        stockMinimo: 10,
        hoy,
      }),
    ).toBe(false);
  });
});

describe('decidirFuente (RF-27 degradación elegante, P5.2)', () => {
  it('modelo si hay predicción vigente, promedio móvil si no', () => {
    expect(decidirFuente(true)).toBe('modelo');
    expect(decidirFuente(false)).toBe('promedio_movil');
  });
});
