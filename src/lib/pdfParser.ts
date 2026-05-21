import { TRANSACOES } from "../data/transactions";

export interface Transacao {
  id: number;
  titular: string;
  cartao: string;
  data: string;
  raw: string;
  nome: string;
  parcela: string;
  valor: number;
  cidade: string;
  tipo: string;
  destino?: string;
  clienteNome?: string;
  conferido?: boolean;
}

/**
 * Maps description to existing categories/titulars based on previous data.
 */
export const identifyTransaction = (description: string, value: number, transactions: Transacao[]): Partial<Transacao> => {
  const normalizedDesc = description.toLowerCase();
  
  // Find a previous transaction with similar raw description
  const match = transactions.find(t => 
    t.raw.toLowerCase().includes(normalizedDesc) || 
    normalizedDesc.includes(t.raw.toLowerCase())
  );

  if (match) {
    return {
      nome: match.nome,
      titular: match.titular,
      cidade: match.cidade,
      tipo: match.tipo,
      destino: match.destino || match.tipo
    };
  }

  // Fallbacks based on common keywords
  if (normalizedDesc.includes('mercadopago') || normalizedDesc.includes('mercadolivre')) {
    return { cidade: 'Online', tipo: 'Loja', titular: 'Isabela' };
  }
  
  if (normalizedDesc.includes('ifood') || normalizedDesc.includes('uber')) {
    return { cidade: 'Online', tipo: 'Serviço Digital' };
  }

  return {
    cidade: 'Não identificado',
    tipo: 'Loja'
  };
};

/**
 * Enhanced PDF Parsing logic.
 * Currently simulates extraction but maps correctly to the data structure.
 */
export const parseC6PDF = async (file: File): Promise<Transacao[]> => {
  // In a real scenario, we'd use pdf.js or similar.
  // Here we simulate the extraction of "new" rows that would be in a May statement.
  
  const baseId = Date.now();
  
  // Simulated extracted rows from a PDF
  const extractedRows = [
    { data: '05 mai', raw: 'AMAZON.COM.BR', valor: 89.90 },
    { data: '10 mai', raw: 'REGINA PANIFICADORA', valor: 45.00 },
    { data: '12 mai', raw: 'POSTO MIRANTE', valor: 150.00 },
    { data: '15 mai', raw: 'NETFLIX.COM', valor: 55.90 },
    { data: '18 mai', raw: 'DROGARIA RAIA', valor: 124.30 },
  ];

  const transactions = extractedRows.map((row, index) => {
    const identified = identifyTransaction(row.raw, row.valor, TRANSACOES);
    return {
      id: baseId + index,
      titular: identified.titular || 'Isabela',
      cartao: '1691',
      data: row.data,
      raw: row.raw,
      nome: identified.nome || row.raw,
      parcela: '',
      valor: row.valor,
      cidade: identified.cidade || 'Não identificado',
      tipo: identified.tipo || 'Loja',
      destino: identified.destino,
      conferido: false
    };
  });

  return transactions;
};

