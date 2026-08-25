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
  titular?: string;
  cidade?: string;
  destino?: string;
  clienteNome?: string;
};

export type InheritMatch = {
  id: number;
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

  for (const t of current) {
    const key = norm(t.nome || t.raw || '');
    if (!key) continue;

    const parts = parcelaParts(t.parcela);
    let source: Tx | undefined;
    let motivo: InheritMatch['motivo'] = 'nome';

    if (parts) {
      const [atual, total] = parts;
      source = previous.find(p => {
        const pp = parcelaParts(p.parcela);
        return !!pp && pp[1] === total && pp[0] === atual - 1 && norm(p.nome || p.raw || '') === key;
      });
      if (source) motivo = 'parcela';
    }

    if (!source) {
      source = previous.find(p => norm(p.nome || p.raw || '') === key);
    }
    if (!source) continue;

    const config: InheritableConfig = {};
    if (source.titular) config.titular = source.titular;
    if (source.cidade) config.cidade = source.cidade;
    if (source.destino) config.destino = source.destino;
    if (source.clienteNome) config.clienteNome = source.clienteNome;
    if (Object.keys(config).length === 0) continue;

    matches.push({ id: t.id, nome: t.nome, origem: source.nome, motivo, config });
  }

  return matches;
};
