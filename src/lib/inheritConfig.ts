const norm = (s: string) =>
  (s ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/PARC\s*\d+\/\d+/g, '')
    .replace(/\d+\/\d+/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parcelaParts = (p?: string): [number, number] | null => {
  if (!p || p === '—') return null;
  const [a, t] = String(p).split('/').map(Number);
  if (!a || !t || isNaN(a) || isNaN(t)) return null;
  return [a, t];
};

export type InheritableConfig = {
  nome?: string;
  titular?: string;
  cidade?: string;
  destino?: string;
  clienteNome?: string;
};

export type InheritMatch = {
  id: number;
  sourceId?: number;
  nome: string;
  origem: string;
  motivo: 'parcela' | 'nome';
  config: InheritableConfig;
};

type Tx = {
  id: number;
  nome: string;
  raw?: string;
  parcela?: string;
  cartao?: string;
  valor?: number;
  titular?: string;
  cidade?: string;
  destino?: string;
  clienteNome?: string;
};

/**
 * Identifica lançamentos do mês atual que são continuação de lançamentos do
 * mês anterior (parcela N+1/T, ou mesmo estabelecimento recorrente) e devolve
 * as configurações já editadas na fatura anterior para serem aplicadas.
 */
export const findInheritedConfigs = (current: Tx[], previous: Tx[]): InheritMatch[] => {
  const matches: InheritMatch[] = [];

  const similarity = (a: string, b: string) => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const left = new Set(a.split(' ').filter(Boolean));
    const right = new Set(b.split(' ').filter(Boolean));
    const common = [...left].filter(token => right.has(token)).length;
    return (2 * common) / (left.size + right.size);
  };

  const matchScore = (currentTx: Tx, candidate: Tx) => {
    const rawScore = similarity(norm(currentTx.raw || ''), norm(candidate.raw || ''));
    const nameScore = similarity(norm(currentTx.nome || ''), norm(candidate.nome || ''));
    const identityScore = Math.max(rawScore, nameScore);
    if (identityScore < 0.55) return -1;

    let score = identityScore * 100;
    if (currentTx.cartao && candidate.cartao === currentTx.cartao) score += 20;
    if (currentTx.valor !== undefined && candidate.valor !== undefined) {
      const base = Math.max(Math.abs(currentTx.valor), Math.abs(candidate.valor), 1);
      score += Math.max(0, 15 - (Math.abs(currentTx.valor - candidate.valor) / base) * 15);
    }
    return score;
  };

  const bestMatch = (tx: Tx, candidates: Tx[]) => candidates
    .map(candidate => ({ candidate, score: matchScore(tx, candidate) }))
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.candidate;

  for (const t of current) {
    if (!norm(t.raw || t.nome || '')) continue;

    const parts = parcelaParts(t.parcela);
    let source: Tx | undefined;
    let motivo: InheritMatch['motivo'] = 'nome';

    if (parts) {
      const [atual, total] = parts;
      const previousInstallments = previous.filter(p => {
        const pp = parcelaParts(p.parcela);
        return !!pp && pp[1] === total && pp[0] === atual - 1;
      });
      source = bestMatch(t, previousInstallments);
      if (source) motivo = 'parcela';
    }

    if (!source) {
      source = bestMatch(t, previous);
    }
    if (!source) continue;

    const config: InheritableConfig = {};
    if (source.nome) config.nome = source.nome;
    if (source.titular) config.titular = source.titular;
    if (source.cidade) config.cidade = source.cidade;
    if (source.destino) config.destino = source.destino;
    if (source.clienteNome) config.clienteNome = source.clienteNome;
    if (Object.keys(config).length === 0) continue;

    matches.push({ id: t.id, sourceId: source.id, nome: t.nome, origem: source.nome, motivo, config });
  }

  return matches;
};
