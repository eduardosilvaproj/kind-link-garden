import { Transacao } from "../types/index";

export const processTransactions = (transactions: Transacao[], edits: Record<string, any>) => {
  const rawRows = transactions.map(t => {
    const e = edits[`${t.id}`] || {};
    const isNegative = t.tipo === 'Crédito' || t.tipo === 'Estorno' || t.tipo === 'Pagamento';
    
    let val = t.valor;
    if (e.valor !== undefined) {
      const parsed = typeof e.valor === 'string' 
        ? parseFloat(e.valor.replace(/[R$\s.]/g, '').replace(',', '.'))
        : Number(e.valor);
      if (!isNaN(parsed)) val = parsed;
    }
    
    const finalVal = isNegative ? -Math.abs(val) : val;
    return {
      ...t,
      titular:     e.titular     ?? t.titular,
      cidade:      e.cidade      ?? t.cidade,
      destino:     e.destino     ?? t.destino ?? t.tipo,
      clienteNome: e.clienteNome ?? t.clienteNome ?? '',
      conferido:   e.conferido   ?? false,
      nome:        e.nome        ?? t.nome,
      valor:       val,
      finalVal
    };
  });

  const grouped = [...rawRows].sort((a, b) => {
    if (a.titular !== b.titular) return a.titular.localeCompare(b.titular);
    return a.id - b.id;
  });

  const balances: Record<string, number> = {};
  
  return grouped.map(t => {
    if (!balances[t.titular]) balances[t.titular] = 0;
    balances[t.titular] += t.finalVal;
    
    return {
      ...t,
      saldoAcumulado: balances[t.titular]
    };
  });
};

export const getAggregatedData = (rows: any[]) => {
  const totals: Record<string, number> = { Isabela: 0, Claudio: 0, Daniel: 0 };
  const CIDADES = ['Araraquara', 'Bauru', 'Ribeirão Preto', 'São Carlos', 'Online', 'Não identificado'];
  const categories = [...CIDADES, 'Encargos'];
  const crossTab: Record<string, any> = {};
  
  categories.forEach(cat => {
    crossTab[cat] = { Isabela: 0, Claudio: 0, Daniel: 0, label: cat, total: 0 };
  });

  rows.forEach(t => {
    const titular = t.titular;
    const finalVal = t.finalVal;

    if (totals.hasOwnProperty(titular)) {
      totals[titular] += finalVal;
    }

    let category = t.cidade;
    if (t.tipo === 'Encargo Bancário') category = 'Encargos';
    if (!category || !categories.includes(category)) category = 'Não identificado';

    if (crossTab[category] && crossTab[category].hasOwnProperty(titular)) {
      crossTab[category][titular] += finalVal;
      crossTab[category].total += finalVal;
    }
  });

  return { 
    totals, 
    crossTab: Object.values(crossTab) 
  };
};