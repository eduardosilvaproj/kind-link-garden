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

const BANK_FEE_PATTERN = /^(anuidade|multa|iof|juros|encargos?)/i;
const CREDIT_PATTERN = /(pagamento|credito|cr[eé]dito)/i;
const REVERSAL_PATTERN = /(estorno)/i;

const normalize = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const getSimilarity = (s1: string, s2: string): number => {
  const n1 = normalize(s1);
  const n2 = normalize(s2);
  
  if (n1 === n2) return 1;
  
  if (n1.includes(n2) || n2.includes(n1)) {
    return Math.min(n1.length, n2.length) / Math.max(n1.length, n2.length);
  }
  
  let commonPrefix = 0;
  const minLen = Math.min(n1.length, n2.length);
  for (let i = 0; i < minLen; i++) {
    if (n1[i] === n2[i]) commonPrefix++;
    else break;
  }
  
  const prefixScore = commonPrefix / Math.max(n1.length, n2.length);
  if (prefixScore > 0.4) return prefixScore;

  const words1 = n1.split(/\s+/).filter(w => w.length > 2);
  const words2 = n2.split(/\s+/).filter(w => w.length > 2);
  const common = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  
  return (common.length * 2) / (words1.length + words2.length);
};

export const identifyTransaction = (description: string, value: number, transactions: Transacao[]): Partial<Transacao> => {
  const normalizedDescEarly = normalize(description);

  // PRIMEIRO: padrões conhecidos têm prioridade sobre similaridade histórica
  if (CREDIT_PATTERN.test(normalizedDescEarly)) {
    return { tipo: 'Crédito', cidade: 'Não identificado' };
  }

  if (REVERSAL_PATTERN.test(normalizedDescEarly)) {
    return { tipo: 'Estorno', cidade: 'Online' };
  }

  if (BANK_FEE_PATTERN.test(normalizedDescEarly)) {
    return { tipo: 'Encargo Bancário', cidade: 'Não identificado' };
  }

  if (!transactions || transactions.length === 0) {
    if (normalizedDescEarly.includes('mercadopago')) {
      return { cidade: 'Online', tipo: 'Serviço Digital', titular: 'Isabela' };
    }
    if (normalizedDescEarly.includes('mercadolivre')) {
      return { cidade: 'Online', tipo: 'Loja', titular: 'Isabela' };
    }
    return {};
  }

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

  if (bestMatch && bestScore > 0.4) {
    return {
      nome: bestMatch.nome,
      titular: bestMatch.titular,
      cidade: bestMatch.cidade,
      tipo: bestMatch.tipo,
      destino: bestMatch.destino,
      clienteNome: bestMatch.clienteNome
    };
  }

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

const IGNORE_LINES = [
  'Subtotal deste cartão',
  'Valores em reais',
  'Cartão Virtual',
  'Transações do cartão principal',
  'Transações dos cartões adicionais',
  'Vencimento:',
  'Valor da fatura:',
  'Melhor dia de compra:',
  'Anuidade:',
  'Isento',
  'Desativado',
  'Cartão com final',
];

export const processLines = (lines: string[], historicalTransactions: Transacao[] = []): Transacao[] => {
  const transactions: Transacao[] = [];
  let currentTitular = 'Isabela';
  let currentCartao = '1691';
  let currentTransaction: Partial<Transacao> | null = null;
  const baseId = Date.now();
  let index = 0;

  const flushTransaction = () => {
    if (currentTransaction && currentTransaction.data && currentTransaction.raw && currentTransaction.valor !== undefined) {
      const rawDesc = currentTransaction.raw.trim();
      const valor = currentTransaction.valor;
      const identified = identifyTransaction(rawDesc, valor, historicalTransactions);
      const isEstorno = currentTransaction.parcela === 'Estorno' || valor < 0;
      const tipoFinal = isEstorno
        ? 'Estorno'
        : (identified.tipo || 'Loja');

      transactions.push({
        id: baseId + index++,
        titular: currentTransaction.titular || identified.titular || currentTitular || 'Isabela',
        cartao: currentTransaction.cartao || currentCartao,
        data: currentTransaction.data,
        raw: rawDesc,
        nome: identified.nome || rawDesc,
        parcela: currentTransaction.parcela || '—',
        valor: Math.abs(valor),
        cidade: isEstorno ? '—' : (identified.cidade || 'Não identificado'),
        tipo: tipoFinal,
        destino: identified.destino,
        clienteNome: identified.clienteNome,
        conferido: false
      });
    }
    currentTransaction = null;
  };

  const isDate = (str: string) => /^\d{2} (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)$/i.test(str);
  const isValue = (str: string) => /^-?(R\$\s)?(\d{1,3}(\.\d{3})*,\d{2})$/.test(str);
  const isInstallment = (str: string) => /^-?\s*Parcela \d+\/\d+$/i.test(str);
  const isEstorno = (str: string) => /^-?\s*Estorno$/i.test(str);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cardMatch = line.match(/C6 Carbon (Virtual )?Final (\d{4}) - (.*)/i);
    if (cardMatch) {
      flushTransaction();
      currentCartao = cardMatch[2];
      const fullName = cardMatch[3].toUpperCase();
      if (fullName.includes('CLAUDIO')) currentTitular = 'Claudio';
      else if (fullName.includes('DANIEL')) currentTitular = 'Daniel';
      else currentTitular = 'Isabela';
      continue;
    }

    if (IGNORE_LINES.some(ignore => line.includes(ignore))) {
      continue;
    }

    if (isDate(line)) {
      flushTransaction();
      currentTransaction = {
        data: line.toLowerCase(),
        raw: '',
        titular: currentTitular,
        cartao: currentCartao
      };
      continue;
    }

    if (currentTransaction) {
      if (isInstallment(line)) {
        currentTransaction.parcela = line.replace(/^-?\s*Parcela /, '');
      } else if (isEstorno(line)) {
        currentTransaction.parcela = 'Estorno';
      } else if (isValue(line)) {
        let valStr = line.replace('R$', '').replace('.', '').replace(',', '.').trim();
        let val = parseFloat(valStr);
        
        // Se já sabemos que é estorno, o valor deve ser negativo
        if (currentTransaction.parcela === 'Estorno') {
          val = -Math.abs(val);
        }
        currentTransaction.valor = val;
      } else if (line !== '-') {
        // Ignora apenas o traço isolado que às vezes aparece entre o nome e a parcela
        currentTransaction.raw = (currentTransaction.raw || '') + ' ' + line;
      }
    }
  }

  flushTransaction();

  // Compatibility with old format
  if (transactions.length === 0) {
    const fullText = lines.join(' ');
    const transactionRegex = /(\d{2}\/\d{2})\s+(.*?)\s+(?:(\d+\/\d+)\s+)?(-?\d+(?:\.\d+)?,\d{2})/g;
    let match;
    while ((match = transactionRegex.exec(fullText)) !== null) {
      const [_, date, rawDesc, parcela, valorStr] = match;
      const valor = parseFloat(valorStr.replace('.', '').replace(',', '.'));
      const identified = identifyTransaction(rawDesc, valor, historicalTransactions);
      
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      const [day, month] = date.split('/');
      const monthIndex = parseInt(month) - 1;
      const formattedDate = `${day} ${months[monthIndex] || month}`;

      transactions.push({
        id: baseId + index++,
        titular: identified.titular || 'Isabela',
        cartao: '1691',
        data: formattedDate,
        raw: rawDesc.trim(),
        nome: identified.nome || rawDesc.trim(),
        parcela: parcela || '—',
        valor: Math.abs(valor),
        cidade: identified.cidade || 'Não identificado',
        tipo: valor < 0 ? 'Estorno' : (identified.tipo || 'Loja'),
        conferido: false
      });
    }
  }

  return transactions;
};

export const parseC6PDF = async (file: File, historicalTransactions: Transacao[] = []): Promise<Transacao[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    textContent.items.forEach((item: any) => {
      const str = item.str.trim();
      if (str) lines.push(str);
    });
  }

  const transactions = processLines(lines, historicalTransactions);

  if (transactions.length === 0) {
    throw new Error('Nenhuma transação encontrada no PDF. Verifique se o arquivo é uma fatura do C6 Bank válida.');
  }

  return transactions;
};