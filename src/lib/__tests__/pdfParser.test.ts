
import { describe, it, expect } from 'vitest';
import { identifyTransaction, parseC6PDF } from '../pdfParser';
import { Transacao } from '../pdfParser';

const mockHistory: Transacao[] = [
  {
    id: 1,
    titular: 'Claudio',
    cartao: '1691',
    data: '10/04',
    raw: 'REGINA PANIFICADORA ARARAQUARA',
    nome: 'Regina Panificadora',
    parcela: '—',
    valor: 45.00,
    cidade: 'Araraquara',
    tipo: 'Loja',
    destino: 'Cliente',
    clienteNome: 'Cliente A'
  }
];

describe('identifyTransaction', () => {
  it('should inherit fields from similar historical transactions', () => {
    const result = identifyTransaction('REGINA PANIFICADORA', 45.00, mockHistory);
    
    expect(result.titular).toBe('Claudio');
    expect(result.cidade).toBe('Araraquara');
    expect(result.tipo).toBe('Loja');
    expect(result.destino).toBe('Cliente');
    expect(result.clienteNome).toBe('Cliente A');
    expect(result.nome).toBe('Regina Panificadora');
  });

  it('should work with partial matches in both directions', () => {
    const result = identifyTransaction('REGINA PANIFICADORA', 50.00, mockHistory);
    expect(result.titular).toBe('Claudio');
  });
});

describe('parseC6PDF', () => {
  // Note: Testing real PDF parsing might be hard without a real file, 
  // but we can test the logic if we extract it.
  it('should be defined', () => {
    expect(parseC6PDF).toBeDefined();
  });
});
