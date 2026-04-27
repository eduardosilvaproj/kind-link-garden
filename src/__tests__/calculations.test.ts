import { describe, it, expect } from 'vitest';

const CATEGORIAS_FINANCEIRAS = ["Aluguel", "IPTU", "Condomínio", "Seguro"];

const calculateSomaCategorias = (rows: any[], filterTitular: string) => {
  const result: Record<string, number> = {
    "Aluguel": 0,
    "IPTU": 0,
    "Condomínio": 0,
    "Seguro": 0,
    "Outros": 0
  };

  const filtered = rows.filter(t => {
    if (filterTitular !== "Todos" && t.titular !== filterTitular) return false;
    if (t.tipo === 'Crédito' || t.tipo === 'Estorno' || t.tipo === 'Pagamento') return false;
    if (t.valor <= 0) return false;
    return true;
  });

  filtered.forEach(t => {
    const destino = t.destino || t.tipo;
    if (CATEGORIAS_FINANCEIRAS.includes(destino)) {
      result[destino] += t.valor;
    } else {
      result["Outros"] += t.valor;
    }
  });

  return result;
};

const calculateChartData = (rows: any[], filterTitular: string) => {
  const filtered = rows.filter(t => {
    if (filterTitular !== "Todos" && t.titular !== filterTitular) return false;
    if (t.tipo === 'Crédito' || t.tipo === 'Estorno' || t.tipo === 'Pagamento') return false;
    if (t.valor <= 0) return false;
    return true;
  });

  const cityMap: Record<string, number> = {};
  filtered.forEach(t => {
    const cidade = t.cidade || "Não identificado";
    cityMap[cidade] = (cityMap[cidade] || 0) + t.valor;
  });

  return Object.entries(cityMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

describe('Lógica de Recálculo por Titular', () => {
  const mockTransactions = [
    { id: 1, titular: 'Isabela', valor: 100, cidade: 'Araraquara', tipo: 'Loja', destino: 'Aluguel' },
    { id: 2, titular: 'Claudio', valor: 200, cidade: 'Bauru', tipo: 'Loja', destino: 'IPTU' },
    { id: 3, titular: 'Isabela', valor: 50, cidade: 'Online', tipo: 'Loja', destino: 'Outros' },
    { id: 4, titular: 'Claudio', valor: 300, cidade: 'Araraquara', tipo: 'Loja', destino: 'Condomínio' },
  ];

  it('deve filtrar categorias corretamente para Isabela', () => {
    const result = calculateSomaCategorias(mockTransactions, 'Isabela');
    expect(result['Aluguel']).toBe(100);
    expect(result['IPTU']).toBe(0);
    expect(result['Outros']).toBe(50);
  });

  it('deve filtrar categorias corretamente para Claudio', () => {
    const result = calculateSomaCategorias(mockTransactions, 'Claudio');
    expect(result['IPTU']).toBe(200);
    expect(result['Condomínio']).toBe(300);
    expect(result['Aluguel']).toBe(0);
  });

  it('deve mostrar todos se o filtro for "Todos"', () => {
    const result = calculateSomaCategorias(mockTransactions, 'Todos');
    expect(result['Aluguel']).toBe(100);
    expect(result['IPTU']).toBe(200);
    expect(result['Condomínio']).toBe(300);
    expect(result['Outros']).toBe(50);
  });

  it('deve filtrar dados do gráfico corretamente para Isabela', () => {
    const result = calculateChartData(mockTransactions, 'Isabela');
    expect(result).toContainEqual({ name: 'Araraquara', value: 100 });
    expect(result).toContainEqual({ name: 'Online', value: 50 });
    expect(result.find(d => d.name === 'Bauru')).toBeUndefined();
  });
});
