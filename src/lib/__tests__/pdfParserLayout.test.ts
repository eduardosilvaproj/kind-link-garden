import { describe, it, expect, vi } from 'vitest';

// Mock pdfjs-dist before importing pdfParser
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
  version: 'mock'
}));

import { processLines } from '../pdfParser';

describe('processLines - C6 Summary Layout', () => {
  it('should parse the summary layout correctly', () => {
    const lines = [
      'C6 Carbon Final 1691 - CLAUDIO C DIAS JR',
      'Subtotal deste cartão',
      'R$ 30.397,82',
      'Valores em reais',
      '',
      '21 jan',
      'ASAAS',
      '*PRO MOVEL',
      '- Parcela 4/4',
      '507,40',
      '',
      '13 mai',
      'Estorno Tarifa',
      '- Estorno',
      '98,00',
      '',
      'C6 Carbon Virtual Final 8252 - CLAUDIO C DIAS JR',
      'Subtotal deste cartão',
      'R$ 215,41',
      'Cartão Virtual',
      '',
      '18 mai',
      'Encargos',
      '159,80',
      '',
      'Transações dos cartões adicionais',
      'C6 Carbon Final 6353 - DANIEL VITAL',
      'Subtotal deste cartão',
      'R$ 1.297,24',
      'Valores em reais',
      '',
      '07 mai',
      'ASSISTEC ARARAQUARA',
      '- Parcela 1/3',
      '216,64'
    ];

    const result = processLines(lines);

    expect(result).toHaveLength(4);

    // Transaction 1
    expect(result[0]).toMatchObject({
      data: '21 jan',
      raw: 'ASAAS *PRO MOVEL',
      valor: 507.40,
      parcela: '4/4',
      titular: 'Claudio',
      cartao: '1691'
    });

    // Transaction 2 (Estorno)
    expect(result[1]).toMatchObject({
      data: '13 mai',
      raw: 'Estorno Tarifa',
      valor: 98.00, // App usually stores absolute value and handles type
      parcela: 'Estorno',
      tipo: 'Estorno',
      titular: 'Claudio',
      cartao: '1691'
    });

    // Transaction 3 (Encargos on Virtual Card)
    expect(result[2]).toMatchObject({
      data: '18 mai',
      raw: 'Encargos',
      valor: 159.80,
      titular: 'Claudio',
      cartao: '8252'
    });

    // Transaction 4 (Daniel Card)
    expect(result[3]).toMatchObject({
      data: '07 mai',
      raw: 'ASSISTEC ARARAQUARA',
      valor: 216.64,
      parcela: '1/3',
      titular: 'Daniel',
      cartao: '6353'
    });
  });

  it('should support legacy format as fallback', () => {
    const lines = [
      '05/05 AMAZON.COM.BR 89,90',
      '10/05 REGINA PANIFICADORA 2/10 45,00'
    ];

    const result = processLines(lines);
    expect(result).toHaveLength(2);
    expect(result[0].data).toBe('05 mai');
    expect(result[1].parcela).toBe('2/10');
  });

  it('should not let page footer overwrite the value of the last transaction on a page', () => {
    // Cenário extraído da fatura de Junho/2026: a última transação de uma
    // página é seguida pelo rodapé/cabeçalho da próxima ("Vencimento:",
    // "Valor da fatura: R$ 9.803,77", etc). Antes do fix, o R$ 9.803,77
    // sobrescrevia o valor capturado da transação anterior.
    const lines = [
      'C6 Carbon Final 1691 - CLAUDIO C DIAS JR',
      'Subtotal deste cartão',
      'R$ 30.397,82',
      'Valores em reais',
      '13 mai',
      'L DESIGN',
      '- Parcela 2/2',
      '404,10',
      // rodapé/cabeçalho injetado entre páginas
      '6',
      '12',
      '/',
      'Vencimento:',
      '25 de Junho',
      'Valor da fatura:',
      'R$ 9.803,77',
      'Melhor dia de compra:',
      '18',
      'CLAUDIO CHRISTOVAO DIAS',
      'Cartão C6 Carbon',
      'Débito automático:',
      'Desativado',
      'Anuidade:',
      'Isento',
      'Lembrando: nesta fatura serão lançadas apenas transações feitas até 18/06/26.',
      'Transações do cartão principal',
      'Valores em reais',
      '15 mai',
      'CONFIANCA DE*CONFIANCA',
      '515,70',
    ];

    const result = processLines(lines);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      data: '13 mai',
      raw: 'L DESIGN',
      valor: 404.10,
      parcela: '2/2',
    });
    expect(result[1]).toMatchObject({
      data: '15 mai',
      raw: 'CONFIANCA DE*CONFIANCA',
      valor: 515.70,
    });
  });
});