import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
 * Normalizes a string for comparison by removing accents and making it lowercase.
 */
const normalize = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Calculates a simple similarity score between two strings (0 to 1).
 */
const getSimilarity = (s1: string, s2: string): number => {
  const n1 = normalize(s1);
  const n2 = normalize(s2);
  
  if (n1 === n2) return 1;
  if (n1.includes(n2) || n2.includes(n1)) {
    return Math.min(n1.length, n2.length) / Math.max(n1.length, n2.length);
  }
  
  // Very basic overlap check
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  const common = words1.filter(w => words2.includes(w));
  
  return (common.length * 2) / (words1.length + words2.length);
};

/**
 * Maps description to existing categories/titulars based on previous data.
 */
export const identifyTransaction = (description: string, value: number, transactions: Transacao[]): Partial<Transacao> => {
  if (!transactions || transactions.length === 0) return {};

  // Try to find a match by similarity
  let bestMatch: Transacao | null = null;
  let bestScore = 0;

  for (const t of transactions) {
    const score = getSimilarity(description, t.raw);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = t;
    }
    if (bestScore === 1) break;
  }

  // Threshold for inheritance
  if (bestMatch && bestScore > 0.6) {
    return {
      nome: bestMatch.nome,
      titular: bestMatch.titular,
      cidade: bestMatch.cidade,
      tipo: bestMatch.tipo,
      destino: bestMatch.destino,
      clienteNome: bestMatch.clienteNome
    };
  }

  // Fallbacks based on common keywords if no good historical match
  const normalizedDesc = normalize(description);
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
 * Enhanced PDF Parsing logic using pdfjs-dist.
 */
export const parseC6PDF = async (file: File, historicalTransactions: Transacao[] = []): Promise<Transacao[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  // Regex to match C6 bank transaction lines
  // Format examples: 
  // 05/05 AMAZON.COM.BR 89,90
  // 10/05 REGINA PANIFICADORA 2/10 45,00
  // 12/05 ESTORNO COMPRA -15,99
  
  // This regex looks for:
  // Date (DD/MM)
  // Description (text until we find a price or installment)
  // Optional installment (N/M)
  // Price (optional minus sign, digits, comma, 2 digits)
  const transactionRegex = /(\d{2}\/\d{2})\s+(.*?)\s+(?:(\d+\/\d+)\s+)?(-?\d+(?:.\d+)?,\d{2})/g;
  
  const transactions: Transacao[] = [];
  let match;
  const baseId = Date.now();
  let index = 0;

  while ((match = transactionRegex.exec(fullText)) !== null) {
    const [_, date, rawDesc, parcela, valorStr] = match;
    
    // Convert valorStr "89,90" or "-15,99" to number
    const valor = parseFloat(valorStr.replace('.', '').replace(',', '.'));
    
    // Identify using history
    const identified = identifyTransaction(rawDesc, valor, historicalTransactions);
    
    // Convert date "05/05" to "05 mai" format used in app
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const [day, month] = date.split('/');
    const monthIndex = parseInt(month) - 1;
    const formattedDate = `${day} ${months[monthIndex] || month}`;

    transactions.push({
      id: baseId + index,
      titular: identified.titular || 'Isabela',
      cartao: '1691', // Default or extracted if possible
      data: formattedDate,
      raw: rawDesc.trim(),
      nome: identified.nome || rawDesc.trim(),
      parcela: parcela || '—',
      valor: Math.abs(valor),
      cidade: identified.cidade || 'Não identificado',
      tipo: valor < 0 ? 'Estorno' : (identified.tipo || 'Loja'),
      destino: identified.destino,
      clienteNome: identified.clienteNome,
      conferido: false
    });
    
    index++;
  }

  if (transactions.length === 0) {
    throw new Error('Nenhuma transação encontrada no PDF. Verifique se o arquivo é uma fatura do C6 Bank válida.');
  }

  return transactions;
};
