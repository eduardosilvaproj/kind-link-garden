import { describe, it, expect } from 'vitest';

const calculateTitularTotal = (rows: any[], titular: string) => {
  return rows
    .filter(t => t.titular === titular)
    .reduce((s, t) => {
      // Lógica idêntica ao Index.tsx: soma despesas, subtrai créditos/estornos
      if (t.tipo === 'Crédito' || t.tipo === 'Estorno') return s - Math.abs(t.valor);
      return s + t.valor;
    }, 0);
};

describe('Validação de Cálculo por Titular', () => {
  it('deve somar despesas e subtrair créditos corretamente para um titular', () => {
    const mockRows = [
      { id: 1, titular: 'Isabela', valor: 100, tipo: 'Loja' },
      { id: 2, titular: 'Isabela', valor: 50, tipo: 'Loja' },
      { id: 3, titular: 'Isabela', valor: 30, tipo: 'Crédito' }, // Subtrai 30
      { id: 4, titular: 'Claudio', valor: 200, tipo: 'Loja' },  // Outro titular
    ];

    const totalIsabela = calculateTitularTotal(mockRows, 'Isabela');
    // 100 + 50 - 30 = 120
    expect(totalIsabela).toBe(120);
  });

  it('deve refletir a mudança de titular no recálculo', () => {
    const mockRows = [
      { id: 1, titular: 'Isabela', valor: 100, tipo: 'Loja' },
      { id: 2, titular: 'Claudio', valor: 200, tipo: 'Loja' },
    ];

    expect(calculateTitularTotal(mockRows, 'Isabela')).toBe(100);
    expect(calculateTitularTotal(mockRows, 'Claudio')).toBe(200);

    // Simulando edição: movendo id 1 de Isabela para Claudio
    const updatedRows = mockRows.map(r => r.id === 1 ? { ...r, titular: 'Claudio' } : r);

    expect(calculateTitularTotal(updatedRows, 'Isabela')).toBe(0);
    expect(calculateTitularTotal(updatedRows, 'Claudio')).toBe(300);
  });

  it('deve tratar estornos como valores negativos', () => {
    const mockRows = [
      { id: 1, titular: 'Daniel', valor: 100, tipo: 'Loja' },
      { id: 2, titular: 'Daniel', valor: -20, tipo: 'Estorno' }, // Valor já negativo ou positivo, usamos Math.abs para garantir
    ];

    const totalDaniel = calculateTitularTotal(mockRows, 'Daniel');
    expect(totalDaniel).toBe(80);
  });
});
