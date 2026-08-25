import { describe, expect, it } from 'vitest';
import { findInheritedConfigs } from '../inheritConfig';

describe('findInheritedConfigs', () => {
  it('herda a parcela anterior pelo texto original mesmo com descrição editada', () => {
    const previous = [{
      id: 70001,
      nome: 'Descrição personalizada',
      raw: 'MERCADO*MERCADOLIVRE',
      parcela: '6/10',
      cartao: '1691',
      valor: 65.9,
      titular: 'Isabela',
      cidade: 'Bauru',
      destino: 'Cliente',
      clienteNome: 'Ana',
    }];
    const current = [{
      id: 80001,
      nome: 'Mercado Mercadolivre',
      raw: 'MERCADO*MERCADOLIVRE',
      parcela: '7/10',
      cartao: '1691',
      valor: 65.9,
      titular: 'Claudio',
      cidade: 'Não identificado',
    }];

    expect(findInheritedConfigs(current, previous)).toEqual([expect.objectContaining({
      id: 80001,
      sourceId: 70001,
      motivo: 'parcela',
      config: {
        nome: 'Descrição personalizada',
        titular: 'Isabela',
        cidade: 'Bauru',
        destino: 'Cliente',
        clienteNome: 'Ana',
      },
    })]);
  });
});