import { describe, it, expect } from 'vitest';
import { processTransactions, getAggregatedData } from '../financeCalculations';
import { Transacao } from '../../types/index';

describe('Finance Calculations', () => {
  const mockTransactions: Transacao[] = [
    { id: 1, titular: 'Isabela', valor: 100, tipo: 'Loja', cidade: 'Araraquara', cartao: '1234', data: '2026-04-01', raw: '', nome: 'Compra 1', parcela: '1/1' },
    { id: 2, titular: 'Isabela', valor: 50, tipo: 'Estorno', cidade: 'Araraquara', cartao: '1234', data: '2026-04-02', raw: '', nome: 'Estorno 1', parcela: '1/1' },
    { id: 3, titular: 'Claudio', valor: 200, tipo: 'Loja', cidade: 'Bauru', cartao: '5678', data: '2026-04-03', raw: '', nome: 'Compra 2', parcela: '1/1' },
  ] as Transacao[];

  it('should group by titular and calculate running balance resetting correctly', () => {
    const rows = processTransactions(mockTransactions, {});
    
    const isabelaRows = rows.filter(r => r.titular === 'Isabela');
    const claudioRows = rows.filter(r => r.titular === 'Claudio');

    expect(isabelaRows[0].saldoAcumulado).toBe(100);
    expect(isabelaRows[1].saldoAcumulado).toBe(50); // 100 - 50 (estorno)
    expect(claudioRows[0].saldoAcumulado).toBe(200); // Reset for Claudio
  });

  it('should react to titular change correctly', () => {
    const edits = {
      '1': { titular: 'Claudio' }
    };
    const rows = processTransactions(mockTransactions, edits);
    
    const isabelaRows = rows.filter(r => r.titular === 'Isabela');
    const claudioRows = rows.filter(r => r.titular === 'Claudio');

    expect(isabelaRows.length).toBe(1);
    expect(claudioRows.length).toBe(2);
    
    // If transaction 1 moved to Claudio, and 3 is already Claudio's:
    // Claudio Rows: id 1 (100), id 3 (200)
    const c1 = claudioRows.find(r => r.id === 1);
    const c3 = claudioRows.find(r => r.id === 3);
    
    expect(c1?.saldoAcumulado).toBe(100);
    expect(c3?.saldoAcumulado).toBe(300); // 100 + 200
  });

  it('should calculate aggregated totals correctly', () => {
    const rows = processTransactions(mockTransactions, {});
    const { totals } = getAggregatedData(rows);

    expect(totals.Isabela).toBe(50);
    expect(totals.Claudio).toBe(200);
    expect(totals.Daniel).toBe(0);
  });
});