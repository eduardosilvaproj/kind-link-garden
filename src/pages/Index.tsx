import React, { useState, useEffect, useMemo } from 'react';
import { TRANSACOES, TOTAL_FATURA } from '../data/transactions';
import { MAY_2026_TRANSACOES } from '../data/may2026Transactions';
import { JUN_2026_TRANSACOES } from '../data/jun2026Transactions';
import { JUL_2026_TRANSACOES } from '../data/jul2026Transactions';
import { AGO_2026_TRANSACOES } from '../data/ago2026Transactions';
import { DEFAULT_CONFIG } from '../data/defaultConfig';
import { exportToXLSX } from '../lib/exportUtils';
import { Download, FileText, Filter, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthTabs } from '@/components/MonthTabs';
import { PDFUpload } from '@/components/PDFUpload';
import { parseC6PDF, identifyTransaction } from '@/lib/pdfParser';
import { findInheritedConfigs } from '@/lib/inheritConfig';
import { Trash2, RefreshCw, Split as SplitIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';



type RowSplit = { cidade: string; titular: string; valor: number };
  type RowEdit = { titular?: string; cidade?: string; destino?: string; clienteNome?: string; conferido?: boolean; nome?: string; valor?: number; splits?: RowSplit[]; };
const CIDADES_FIXAS = ['Araraquara','Bauru','Ribeirão Preto','São Carlos','Online','Não identificado'];
const TITULARES_FIXOS = ['Isabela','Claudio','Daniel'];
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => v > 0.009 || v < -0.009 ? brl(v) : '—';
const titularBg = (t: string) => { if (t === 'Isabela') return 'bg-amber-500 text-white'; if (t === 'Claudio') return 'bg-blue-500 text-white'; return 'bg-teal-500 text-white'; };
const titularInitials = (t: string) => { if (t === 'Isabela') return 'IS'; if (t === 'Claudio') return 'CL'; return 'DN'; };
const rowBg = (tipo: string, cidade: string) => { if (tipo === 'Encargo Bancário') return 'bg-red-50'; if (tipo === 'Crédito') return 'bg-blue-50'; if (tipo === 'Estorno') return 'bg-green-50'; if (cidade === 'Não identificado') return 'bg-amber-50'; return ''; };

const isCreditLike = (tipo: string) =>
  ['Crédito', 'Estorno', 'Pagamento'].includes(tipo);

const isCredito = (tipo: string) => tipo === 'Crédito' || tipo === 'Pagamento';

const totalRows = (rows: Array<{ tipo: string; valor: number }>) =>
  rows.reduce((s, r) => s + (isCreditLike(r.tipo) ? -Math.abs(r.valor) : r.valor), 0);

const sumDespesas = (rows: Array<{ tipo: string; valor: number }>) =>
  rows.filter(r => !isCredito(r.tipo)).reduce((s, r) => s + r.valor, 0);

const sumCreditos = (rows: Array<{ tipo: string; valor: number }>) =>
  rows.filter(r => isCredito(r.tipo)).reduce((s, r) => s + Math.abs(r.valor), 0);

const TOTAL_LIQUIDO_MAIO = 13681.47;
const TOTAL_LIQUIDO_JUNHO = 9803.77;
const TOTAL_LIQUIDO_JULHO = 21897.44;
const TOTAL_LIQUIDO_AGOSTO = 3700.18;


export default function Index() {
  const { toast } = useToast();
  const config = DEFAULT_CONFIG;

  const [activeTab, setActiveTab] = useState('abril');
  const [mayTransactions, setMayTransactions] = useState<any[]>(MAY_2026_TRANSACOES);
  const [junTransactions, setJunTransactions] = useState<any[]>(JUN_2026_TRANSACOES);
  const [julTransactions, setJulTransactions] = useState<any[]>(JUL_2026_TRANSACOES);
  const [agoTransactions, setAgoTransactions] = useState<any[]>(AGO_2026_TRANSACOES);
  const [filterTitular, setFilterTitular] = useState('Todos');
  const [showPendentes, setShowPendentes] = useState(false);
  const [showPagamentos, setShowPagamentos] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'id' | 'nome' | 'valor' | 'data' | 'titular' | 'cidade'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');


  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };
  const [edits, setEdits] = useState<Record<string, RowEdit>>(() => { try { const raw = localStorage.getItem('fatura_edits_v4'); return raw ? JSON.parse(raw) : {}; } catch { return {}; } });
  
  useEffect(() => { localStorage.setItem('fatura_edits_v4', JSON.stringify(edits)); }, [edits]);
  
  const editKey = (tab: string, id: number) => `${tab}:${id}`;
  const getEdit = (tab: string, id: number) => edits[editKey(tab, id)] ?? edits[String(id)] ?? {};
  const updateRow = (id: number, patch: Partial<RowEdit>) => { setEdits(prev => { const key = editKey(activeTab, id); return { ...prev, [key]: { ...(prev[key] ?? prev[String(id)]), ...patch } }; }); };
  const updateBatch = (ids: number[], patch: Partial<RowEdit>) => { setEdits(prev => { const next = { ...prev }; ids.forEach(id => { const key = editKey(activeTab, id); next[key] = { ...(next[key] ?? next[String(id)]), ...patch }; }); return next; }); };
  
  const historicalTransactions = useMemo(() => {
    return TRANSACOES.map(t => {
      const e = getEdit('abril', t.id);
      return {
        ...t,
        titular: e.titular !== undefined ? e.titular : t.titular,
        cidade: e.cidade !== undefined ? e.cidade : t.cidade,
        destino: e.destino !== undefined ? e.destino : (t.destino ?? t.tipo),
        clienteNome: e.clienteNome !== undefined ? e.clienteNome : (t.clienteNome ?? ''),
        nome: e.nome !== undefined ? e.nome : t.nome,
        valor: e.valor !== undefined ? e.valor : t.valor
      };
    });
  }, [edits]);

  const rows = useMemo(() => {
    const baseData = activeTab === 'abril'
      ? historicalTransactions
      : activeTab === 'agosto' ? agoTransactions
      : activeTab === 'julho' ? julTransactions
      : activeTab === 'junho' ? junTransactions
      : mayTransactions;
    const raw = baseData.map(t => {
       const e = getEdit(activeTab, t.id);
      return { 
        ...t, 
        titular: e.titular !== undefined ? e.titular : t.titular,
        cidade: e.cidade !== undefined ? e.cidade : t.cidade,
        destino: e.destino !== undefined ? e.destino : (t.destino ?? t.tipo),
        clienteNome: e.clienteNome !== undefined ? e.clienteNome : (t.clienteNome ?? ''),
        conferido: e.conferido !== undefined ? e.conferido : false,
        nome: e.nome !== undefined ? e.nome : t.nome,
        valor: e.valor !== undefined ? e.valor : t.valor
      };
    });

    const expanded = raw.flatMap(t => {
       const splits = getEdit(activeTab, t.id).splits;
      if (!splits || splits.length === 0) return [{ ...t, rowKey: String(t.id), isSplit: false, splitIndex: -1, valorOriginal: t.valor }];
      return splits.map((s, i) => ({
        ...t,
        titular: s.titular,
        cidade: s.cidade,
        valor: s.valor,
        rowKey: `${t.id}-${i}`,
        isSplit: true,
        splitIndex: i,
        splitCount: splits.length,
        valorOriginal: t.valor,
      }));
    });

    const sorted = [...expanded].sort((a,b) => a.titular.localeCompare(b.titular) || a.id - b.id || a.splitIndex - b.splitIndex);
    let currentTitular = '';
    let accumulated = 0;
    
    return sorted.map(t => {
      if (t.titular !== currentTitular) {
        currentTitular = t.titular;
        accumulated = 0;
      }
      const isNegative = t.tipo === 'Crédito' || t.tipo === 'Estorno' || t.tipo === 'Pagamento';
      accumulated += (isNegative ? -Math.abs(t.valor) : t.valor);
      return { ...t, saldoAcumulado: accumulated };
    });
  }, [edits, activeTab, mayTransactions, junTransactions, julTransactions, agoTransactions, historicalTransactions]);



  const totalDespesas = useMemo(() => sumDespesas(rows), [rows]);
  const totalCreditos = useMemo(() => sumCreditos(rows), [rows]);
  const totalLiquido = totalDespesas - totalCreditos;
  const isMaio = activeTab === 'maio';
  const isJunho = activeTab === 'junho';
  const isJulho = activeTab === 'julho';
  const isAgosto = activeTab === 'agosto';
  const totalFaturaAtiva = isAgosto ? TOTAL_LIQUIDO_AGOSTO : isJulho ? TOTAL_LIQUIDO_JULHO : isJunho ? TOTAL_LIQUIDO_JUNHO : isMaio ? TOTAL_LIQUIDO_MAIO : TOTAL_FATURA;

  // Em Maio só contam para o card do responsável os itens distribuídos
  // MANUALMENTE pelo usuário (com edit explícito de titular). O titular
  // inferido pelo parser não distribui automaticamente.
  const sumResp = (resp: string) =>
    rows
       .filter(t => (isMaio ? getEdit(activeTab, t.id).titular !== undefined : true))
      .filter(t => t.titular === resp && !isCredito(t.tipo))
      .reduce((s, t) => s + (t.tipo === 'Estorno' ? -Math.abs(t.valor) : t.valor), 0);

  const somaIsabela = useMemo(() => sumResp('Isabela'), [rows, edits, isMaio]);
  const somaClaudio = useMemo(() => sumResp('Claudio'), [rows, edits, isMaio]);
  const somaDaniel  = useMemo(() => sumResp('Daniel'),  [rows, edits, isMaio]);
  const totalDistribuido = somaIsabela + somaClaudio + somaDaniel;
  const aDistribuir = isMaio ? (TOTAL_LIQUIDO_MAIO - totalDistribuido) : 0;
  const totalConferidos = useMemo(() => rows.filter(t => t.conferido).length, [rows]);

  const PREV_TAB: Record<string, string> = { maio: 'abril', junho: 'maio', julho: 'junho', agosto: 'julho' };

  const applyEdits = (base: any[], tab: string) => base.map(t => {
    const e = getEdit(tab, t.id);
    return {
      ...t,
      titular: e.titular !== undefined ? e.titular : t.titular,
      cidade: e.cidade !== undefined ? e.cidade : t.cidade,
      destino: e.destino !== undefined ? e.destino : (t.destino ?? t.tipo),
      clienteNome: e.clienteNome !== undefined ? e.clienteNome : (t.clienteNome ?? ''),
      nome: e.nome !== undefined ? e.nome : t.nome,
      valor: e.valor !== undefined ? e.valor : t.valor,
    };
  });

  const baseForTab = (tab: string) =>
    tab === 'abril' ? TRANSACOES
    : tab === 'maio' ? mayTransactions
    : tab === 'junho' ? junTransactions
    : tab === 'julho' ? julTransactions
    : agoTransactions;

  const prevTab = PREV_TAB[activeTab];

  const herdarDoMesAnterior = () => {
    if (!prevTab) return;
    const matches = findInheritedConfigs(applyEdits(baseForTab(activeTab), activeTab), applyEdits(baseForTab(prevTab), prevTab));
    if (matches.length === 0) {
      toast({ title: 'Nada para herdar', description: `Nenhum lançamento de ${activeTab} foi encontrado na fatura de ${prevTab}.` });
      return;
    }
    setEdits(prev => {
      const next = { ...prev };
      matches.forEach(m => {
        const key = editKey(activeTab, m.id);
        next[key] = { ...(next[key] ?? next[String(m.id)]), ...m.config };
      });
      return next;
    });
    const parcelas = matches.filter(m => m.motivo === 'parcela').length;
    toast({
      title: 'Configurações herdadas',
      description: `${matches.length} lançamento(s) atualizados a partir de ${prevTab} (${parcelas} parcela(s) em andamento).`,
    });
  };

  // Herda detalhes (descrição, cidade, destino, cliente, titular e divisões)
  // apenas para UMA linha, a partir da fatura do mês anterior.
  const herdarLinha = (row: any) => {
    if (!prevTab) return;
    const original = baseForTab(activeTab).find(x => x.id === row.id);
    if (!original) return;
    const [m] = findInheritedConfigs(applyEdits([original], activeTab), applyEdits(baseForTab(prevTab), prevTab));
    if (!m) {
      toast({ title: 'Sem correspondência', description: `Não encontrei este lançamento na fatura de ${prevTab}.`, variant: 'destructive' });
      return;
    }
    const prevEdit = m.sourceId !== undefined ? getEdit(prevTab, m.sourceId) : undefined;
    const targetKey = editKey(activeTab, row.id);
    setEdits(prev => ({
      ...prev,
      [targetKey]: {
        ...(prev[targetKey] ?? prev[String(row.id)]),
        ...m.config,
        ...(prevEdit?.splits?.length ? { splits: prevEdit.splits.map(s => ({ ...s })) } : {}),
      },
    }));
    toast({
      title: 'Detalhes herdados',
      description: `${m.origem} (${prevTab}) → titular, cidade, destino e cliente aplicados${prevEdit?.splits?.length ? ' + divisões' : ''}.`,
    });
  };


  // ---- Divisão de um lançamento entre múltiplas cidades/titulares ----
  const [splitTargetId, setSplitTargetId] = useState<number | null>(null);
  const [splitDraft, setSplitDraft] = useState<Array<{ cidade: string; titular: string; valor: string }>>([]);

  const openSplit = (t: any) => {
    const existing = getEdit(activeTab, t.id).splits;
    setSplitTargetId(t.id);
    setSplitDraft(
      existing && existing.length > 0
        ? existing.map(s => ({ cidade: s.cidade, titular: s.titular, valor: s.valor.toFixed(2) }))
        : [
            { cidade: t.cidade, titular: t.titular, valor: (t.valorOriginal ?? t.valor).toFixed(2) },
            { cidade: 'Araraquara', titular: t.titular, valor: '0.00' },
          ]
    );
  };

  const closeSplit = () => { setSplitTargetId(null); setSplitDraft([]); };

  const splitTargetRow = useMemo(
    () => rows.find(r => r.id === splitTargetId),
    [rows, splitTargetId]
  );
  const splitTotalOriginal = splitTargetRow ? (splitTargetRow.valorOriginal ?? splitTargetRow.valor) : 0;
  const splitDraftTotal = splitDraft.reduce((s, d) => s + (parseFloat(String(d.valor).replace(',', '.')) || 0), 0);
  const splitDiff = splitTotalOriginal - splitDraftTotal;

  const saveSplit = () => {
    if (splitTargetId === null) return;
    if (Math.abs(splitDiff) > 0.01) {
      toast({
        title: 'Valores não fecham',
        description: `A soma das partes (${brl(splitDraftTotal)}) precisa ser igual ao valor do lançamento (${brl(splitTotalOriginal)}).`,
        variant: 'destructive',
      });
      return;
    }
    const splits: RowSplit[] = splitDraft
      .map(d => ({ cidade: d.cidade, titular: d.titular, valor: parseFloat(String(d.valor).replace(',', '.')) || 0 }))
      .filter(s => Math.abs(s.valor) > 0.001);
    if (splits.length < 2) {
      toast({ title: 'Divisão inválida', description: 'Informe pelo menos duas partes com valor.', variant: 'destructive' });
      return;
    }
    updateRow(splitTargetId, { splits });
    toast({ title: 'Lançamento dividido', description: `${splits.length} partes criadas.` });
    closeSplit();
  };

  const updateSplitPart = (id: number, index: number, patch: Partial<RowSplit>) => {
    setEdits(prev => {
      const key = editKey(activeTab, id);
      const cur = prev[key] ?? prev[String(id)];
      if (!cur?.splits) return prev;
      const splits = cur.splits.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, [key]: { ...cur, splits } };
    });
  };

  const removeSplit = (id: number) => {
    setEdits(prev => {
      const next = { ...prev };
      const key = editKey(activeTab, id);
      const cur = { ...(next[key] ?? next[String(id)] ?? {}) };
      delete cur.splits;
      next[key] = cur;
      return next;
    });
    closeSplit();
    toast({ title: 'Divisão removida' });
  };




  
  const crossTab = useMemo(() => {
    const CIDADES = ['Araraquara','Bauru','Ribeirão Preto','São Carlos','Online','Não identificado'];
    const baseData = activeTab === 'abril'
      ? TRANSACOES
      : activeTab === 'agosto' ? agoTransactions
      : activeTab === 'julho' ? julTransactions
      : activeTab === 'junho' ? junTransactions
      : mayTransactions;
    const effective = baseData.flatMap(t => {
       const e = getEdit(activeTab, t.id);
      const valor = e.valor !== undefined ? e.valor : t.valor;
      if (e.splits && e.splits.length > 0) {
        return e.splits.map(s => ({ id: t.id, titular: s.titular, cidade: s.cidade, tipo: t.tipo, valor: s.valor, data: t.data }));
      }
      return [{
        id: t.id,
        titular: e.titular !== undefined ? e.titular : t.titular,
        cidade:  e.cidade  !== undefined ? e.cidade  : t.cidade,
        tipo:    t.tipo,
        valor,
        data: t.data,
      }];
    });

    // Pagamento da fatura atual = o crédito/pagamento cujo data pertence ao mês ativo.
    const mesSuffix = activeTab === 'agosto' ? ' ago'
      : activeTab === 'julho' ? ' jul'
      : activeTab === 'junho' ? ' jun'
      : activeTab === 'maio' ? ' mai'
      : activeTab === 'abril' ? ' abr'
      : '';
    const pagamentosDoMes = mesSuffix
      ? effective.filter(t => (t.tipo === 'Crédito' || t.tipo === 'Pagamento') && t.data && t.data.toLowerCase().endsWith(mesSuffix))
      : effective.filter(t => t.tipo === 'Crédito' || t.tipo === 'Pagamento');
    const pagamentoAtualId = pagamentosDoMes.slice(-1)[0]?.id;

    return [...CIDADES, 'Encargos'].map(label => {
      const get = (tit: string) => effective
        .filter(t => {
          if (t.titular !== tit) return false;
          if (label === 'Encargos') return t.tipo === 'Encargo Bancário';
          if (label === 'Não identificado') return t.id === pagamentoAtualId;
          return t.cidade === label && t.tipo !== 'Encargo Bancário';
        })
        .reduce((s, t) => s + t.valor, 0);
      const Isabela = get('Isabela');
      const Claudio = get('Claudio');
      const Daniel  = get('Daniel');
      const displayLabel = label === 'Não identificado' ? 'Inclusão de pagamento' : label;
      return { label: displayLabel, Isabela, Claudio, Daniel, total: Isabela + Claudio + Daniel };
    });



  }, [edits, activeTab, mayTransactions, junTransactions, julTransactions, agoTransactions]);


  const filtradas = useMemo(() => {
    return rows
      .filter(t => {
        if (filterTitular !== 'Todos' && t.titular !== filterTitular) return false;
        if (showPendentes && t.cidade !== 'Não identificado') return false;
        if (!showPagamentos && (t.tipo === 'Crédito' || t.tipo === 'Pagamento')) return false;
        if (search.trim()) {
          const s = search.toLowerCase().trim();
          const matchesNome  = t.nome.toLowerCase().includes(s);
          const matchesValor = t.valor.toFixed(2).includes(s) || 
                               t.valor.toLocaleString('pt-BR', {minimumFractionDigits:2}).includes(s);
          const matchesCidade   = t.cidade.toLowerCase().includes(s);
          const matchesTitular  = t.titular.toLowerCase().includes(s);
          if (!matchesNome && !matchesValor && !matchesCidade && !matchesTitular) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let va: any, vb: any;
        if (sortField === 'id') { va = a.id; vb = b.id; }
        if (sortField === 'nome') { va = a.nome; vb = b.nome; }
        if (sortField === 'valor') { va = a.valor; vb = b.valor; }
        if (sortField === 'titular') { va = a.titular; vb = b.titular; }
        if (sortField === 'cidade') { va = a.cidade; vb = b.cidade; }
        if (sortField === 'data') { va = a.id; vb = b.id; }
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        return sortDir === 'asc' ? va - vb : vb - va;
      });
  }, [rows, filterTitular, showPendentes, showPagamentos, search, sortField, sortDir]);

  const exportPDF = () => {
    const monthLabel = isAgosto ? 'Agosto 2026' : isJulho ? 'Julho 2026' : isJunho ? 'Junho 2026' : isMaio ? 'Maio 2026' : 'Abril 2026';
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth();   // 297mm

    // ── Header bar (dark background like the app) ──
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(0, 0, W, 20, 'F');

    // Title
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('Classificador de Fatura C6 Bank', 10, 13);

    // Export date top right
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')}`, W - 50, 13);

    const cards = [
      { label: 'ISABELA (LÍQUIDO)', value: brl(somaIsabela), color: [251, 191, 36] as [number,number,number] },
      { label: 'CLAUDIO (LÍQUIDO)', value: brl(somaClaudio), color: [59, 130, 246] as [number,number,number] },
      { label: 'DANIEL (ADICIONAL)', value: brl(somaDaniel), color: [20, 184, 166] as [number,number,number] },
      { label: 'TOTAL FATURA', value: brl(totalFaturaAtiva), color: [255, 255, 255] as [number,number,number], dark: true },
    ];

    const cardW = (W - 20) / 4;
    cards.forEach((card, i) => {
      const x = 10 + i * (cardW + 1.5);
      const y = 23;
      // card background
      if (card.dark) {
        pdf.setFillColor(15, 23, 42);
      } else {
        pdf.setFillColor(255, 255, 255);
      }
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, y, cardW, 18, 2, 2, card.dark ? 'F' : 'FD');
      // label
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(card.dark ? 148 : 100, card.dark ? 163 : 116, card.dark ? 184 : 139);
      pdf.text(card.label, x + 3, y + 6);
      // value
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...card.color);
      pdf.text(card.value, x + 3, y + 14);
    });

    // ── Section title ──
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text('DISTRIBUIÇÃO CIDADE × TITULAR', 10, 47);

    // ── Cross-tab table ──
    autoTable(pdf, {
      startY: 49,
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
      head: [['Cidade', 'Isabela', 'Claudio', 'Daniel', 'Total']],
      body: crossTab.map(r => [
        r.label,
        r.Isabela > 0.009 ? brl(r.Isabela) : '—',
        r.Claudio > 0.009 ? brl(r.Claudio) : '—',
        r.Daniel  > 0.009 ? brl(r.Daniel)  : '—',
        brl(r.total),
      ]),
      foot: [['TOTAL', brl(somaIsabela), brl(somaClaudio), brl(somaDaniel), brl(somaIsabela+somaClaudio+somaDaniel)]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [31, 56, 100], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 50, halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (d) => {
        // Força mesmo alinhamento em head/body/foot (autoTable centraliza head por padrão)
        d.cell.styles.halign = d.column.index === 0 ? 'left' : 'right';
        if (d.section === 'body' && d.column.index === 0) {
          if (d.cell.text[0] === 'Inclusão de pagamento') d.cell.styles.fillColor = [255, 249, 196];
          if (d.cell.text[0] === 'Encargos') d.cell.styles.fillColor = [254, 226, 226];
        }
      },
    });

    // ── Transactions table (respeita filtros e ordenação da tela) ──
    const body = filtradas.map(t => [
      String(t.id),
      t.conferido ? '✓' : '',
      t.titular,
      t.nome,
      t.cidade,
      t.destino === 'Cliente' && t.clienteNome ? `Cliente — ${t.clienteNome}` : (t.destino || t.tipo),
      brl(Math.abs(t.valor)),
    ]);

    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 6,
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
      head: [['#', '✓', 'Titular', 'Estabelecimento', 'Cidade', 'Destino', 'Valor']],
      body,
      rowPageBreak: 'avoid',
      pageBreak: 'auto',
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [31, 56, 100], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 8,  halign: 'center' },
        2: { cellWidth: 26 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 38 },
        5: { cellWidth: 36 },
        6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: d => {
        if (d.section !== 'body') return;
        const tit = body[d.row.index]?.[2];
        if (tit === 'Isabela') d.cell.styles.textColor = [180, 100, 0];
        else if (tit === 'Claudio') d.cell.styles.textColor = [0, 80, 160];
        else if (tit === 'Daniel')  d.cell.styles.textColor = [0, 120, 80];
      },
      didDrawPage: d => {
        // page header on pages 2+
        if (d.pageNumber > 1) {
          pdf.setFillColor(15, 23, 42);
          pdf.rect(0, 0, W, 8, 'F');
          pdf.setFontSize(8);
          pdf.setTextColor(255, 255, 255);
          pdf.text(`Classificador de Fatura C6 Bank — ${monthLabel}`, 10, 5.5);
        }
        // page number
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(
          `Página ${d.pageNumber} de ${pdf.getNumberOfPages()}`,
          W - 30,
          pdf.internal.pageSize.getHeight() - 4,
        );
      },
    });

    pdf.save(`Fatura_C6_${monthLabel.replace(/\s+/g, '_')}.pdf`);
  };

  // Helper component for sortable header
  const SortTh = ({ field, label, className }: { field: typeof sortField, label: string, className?: string }) => (
    <th
      className={cn("px-4 py-2 cursor-pointer select-none hover:bg-slate-100 transition-colors", className)}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
        <header className="flex justify-between items-center bg-white border rounded-xl px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold">Classificador de Fatura C6 Bank</h1>
              <Badge className="text-[10px] font-bold uppercase px-3 py-1 bg-green-100 text-green-700 border-green-200">
                Total: {brl(totalFaturaAtiva)} ✓
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold uppercase px-3 py-1">✓ Conferidos: {totalConferidos} / {rows.length}</Badge>
            </div>
            <MonthTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToXLSX(rows, config)} className="gap-2"><Download className="w-4 h-4" /> Exportar Excel</Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2"><FileText className="w-4 h-4" /> Exportar PDF</Button>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border shadow-sm p-4"><p className="text-xs font-bold text-slate-500 uppercase mb-1">Isabela (Despesas)</p><p className="text-2xl font-black text-amber-600">{brl(somaIsabela)}</p></div>
          <div className="bg-white rounded-xl border shadow-sm p-4"><p className="text-xs font-bold text-slate-500 uppercase mb-1">Claudio (Despesas)</p><p className="text-2xl font-black text-blue-600">{brl(somaClaudio)}</p></div>
          <div className="bg-white rounded-xl border shadow-sm p-4"><p className="text-xs font-bold text-slate-500 uppercase mb-1">Daniel (Adicional)</p><p className="text-2xl font-black text-teal-600">{brl(somaDaniel)}</p></div>
          <div className="bg-slate-900 rounded-xl shadow-sm p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Líquido da Fatura</p>
            <p className="text-2xl font-black text-white">{brl(totalFaturaAtiva)}</p>
            {activeTab === 'maio' && (
              <div className="mt-2 pt-2 border-t border-slate-700 space-y-0.5">
                <p className="text-[10px] text-slate-400 flex justify-between"><span>Distribuído</span><span className="tabular-nums text-slate-200">{brl(totalDistribuido)}</span></p>
                <p className="text-[10px] text-slate-400 flex justify-between"><span>A distribuir</span><span className={cn("tabular-nums font-bold", Math.abs(aDistribuir) < 0.01 ? 'text-green-400' : 'text-amber-400')}>{brl(aDistribuir)}</span></p>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'maio' && mayTransactions.length === 0 ? (
          <PDFUpload onUpload={async (file) => {
            try {
              // 1. Identify parcelas that carry over from April (using edited data)
              const parcelasToStay = historicalTransactions.filter(t => {
                if (!t.parcela || t.parcela === '—') return false;
                const [atual, total] = t.parcela.split('/').map(Number);
                return !isNaN(atual) && !isNaN(total) && atual < total;
              }).map(t => {
                const [atual, total] = t.parcela.split('/').map(Number);
                return {
                  ...t,
                  id: t.id + 10000, 
                  data: '01 mai',
                  parcela: `${atual + 1}/${total}`,
                  conferido: false
                };
              });

              // 2. Parse new transactions from PDF using historical edited data
              const newTransactions = await parseC6PDF(file, historicalTransactions);
              
              setMayTransactions([...parcelasToStay, ...newTransactions]);
              toast({
                title: "Fatura de Maio carregada",
                description: `${newTransactions.length} novas transações identificadas e ${parcelasToStay.length} parcelas automáticas aplicadas.`,
              });

            } catch (err) {
              console.error(err);
              throw err;
            }
          }} />
        ) : (
          <>
          {prevTab && (
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                onClick={herdarDoMesAnterior}
              >
                <RefreshCw className="w-4 h-4" /> Herdar configurações de {prevTab}
              </Button>
            </div>
          )}
          {activeTab === 'maio' && (
            <div className="flex justify-end gap-2 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 gap-2 border-amber-200"
                onClick={() => {
                  const updated = mayTransactions.map(t => {
                    if (t.parcela && t.parcela !== '—') return t; // Keep parcelas as is
                    const identified = identifyTransaction(t.raw, t.valor, historicalTransactions);
                    return {
                      ...t,
                      ...identified
                    };
                  });
                  setMayTransactions(updated);
                  toast({
                    title: "Mapeamento Atualizado",
                    description: "As transações foram re-identificadas com base no histórico editado.",
                  });

                }}
              >
                <RefreshCw className="w-4 h-4" /> Recarregar Mapeamento
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 border-red-200"
                onClick={() => {
                  setMayTransactions([]);
                  toast({
                    title: "Fatura de Maio removida",
                    description: "Os dados de Maio foram limpos. Você pode enviar outro PDF.",
                  });
                }}
              >
                <Trash2 className="w-4 h-4" /> Excluir Fatura
              </Button>
            </div>
          )}


        <div key={`crosstab-${crossTab.map(r => r.total).join('-')}`} className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b bg-slate-50">
            <p className="text-xs font-bold uppercase text-slate-500">Distribuição Cidade × Titular</p>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <th className="text-left px-6 py-2 font-bold">Cidade</th>
                <th className="text-right px-6 py-2 font-bold">Isabela</th>
                <th className="text-right px-6 py-2 font-bold">Claudio</th>
                <th className="text-right px-6 py-2 font-bold">Daniel</th>
                <th className="text-right px-6 py-2 font-bold bg-slate-100">Total</th>
              </tr>
            </thead>
            <tbody>
              {crossTab.map(row => (
                <tr
                  key={row.label}
                  className={
                    row.label === 'Encargos' ? 'border-t bg-red-50' :
                    row.label === 'Inclusão de pagamento' && row.total > 0 ? 'border-t bg-amber-50' :
                    'border-t'
                  }
                >
                  <td className="px-6 py-2 font-medium">{row.label}</td>
                  <td className="text-right px-6 py-2 tabular-nums">{row.Isabela > 0.009 ? brl(row.Isabela) : '—'}</td>
                  <td className="text-right px-6 py-2 tabular-nums">{row.Claudio > 0.009 ? brl(row.Claudio) : '—'}</td>
                  <td className="text-right px-6 py-2 tabular-nums">{row.Daniel > 0.009 ? brl(row.Daniel) : '—'}</td>
                  <td className="text-right px-6 py-2 tabular-nums font-bold bg-slate-50">{brl(row.total)}</td>
                </tr>
              ))}
              <tr className="border-t bg-slate-100 font-bold">
                <td className="px-6 py-3">TOTAL</td>
                <td className="text-right px-6 py-3 tabular-nums">{brl(crossTab.reduce((s, r) => s + r.Isabela, 0))}</td>
                <td className="text-right px-6 py-3 tabular-nums">{brl(crossTab.reduce((s, r) => s + r.Claudio, 0))}</td>
                <td className="text-right px-6 py-3 tabular-nums">{brl(crossTab.reduce((s, r) => s + r.Daniel, 0))}</td>
                <td className="text-right px-6 py-3 tabular-nums bg-slate-200">{brl(crossTab.reduce((s, r) => s + r.total, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select value={filterTitular} onValueChange={setFilterTitular}><SelectTrigger className="h-8 w-[160px] bg-white"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Isabela">Isabela</SelectItem><SelectItem value="Claudio">Claudio</SelectItem><SelectItem value="Daniel">Daniel</SelectItem></SelectContent></Select>
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border h-8"><Switch id="pend" checked={showPendentes} onCheckedChange={setShowPendentes} className="scale-75" /><Label htmlFor="pend" className="text-[11px] font-bold uppercase cursor-pointer">Pendentes</Label></div>
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border h-8"><Switch id="pgto" checked={showPagamentos} onCheckedChange={setShowPagamentos} className="scale-75" /><Label htmlFor="pgto" className="text-[11px] font-bold uppercase cursor-pointer">Pagamentos</Label></div>
              <div className="relative">
                <Input
                  placeholder="🔍 Buscar estabelecimento..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 w-56 text-sm bg-white pr-7"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >✕</button>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">{filtradas.length} transações</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase text-slate-500 bg-slate-50 border-b">
                <SortTh field="id" label="#" className="w-9 px-2 text-center" />
                <th className="w-10 px-2 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    checked={filtradas.length > 0 && filtradas.every(t => t.conferido)}
                    onChange={e => updateBatch(filtradas.map(t => t.id), { conferido: e.target.checked })}
                  />
                </th>
                <SortTh field="titular" label="Titular" className="w-24 px-4 text-left" />
                <SortTh field="data" label="Data" className="w-24 px-4 text-left" />
                <SortTh field="nome" label="Estabelecimento & Classificação" className="px-4 text-left" />
                <SortTh field="valor" label="Valor" className="w-32 px-4 text-right" />
                <th className="w-32 px-4 text-right bg-slate-50">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(t => (
                <React.Fragment key={t.rowKey}>
                <tr className={cn('border-b transition-colors', rowBg(t.tipo, t.cidade), t.conferido ? 'border-l-4 border-l-green-600' : '', t.isSplit ? 'bg-violet-50/60' : '')}>
                  <td className="px-2 py-3 text-center text-[11px] text-slate-400 font-mono">{t.id}</td>
                  <td className="px-2 py-3 text-center"><input type="checkbox" className="w-4 h-4 rounded accent-green-600" checked={!!t.conferido} onChange={e => updateRow(t.id, { conferido: e.target.checked })} /></td>
                  <td className="px-4 py-3">
                    <Select
                      key={`titular-${t.rowKey}-${t.titular}`}
                      value={t.titular}
                      onValueChange={v => t.isSplit ? updateSplitPart(t.id, t.splitIndex, { titular: v }) : updateRow(t.id, { titular: v })}
                    >
                      <SelectTrigger className={cn('w-10 h-8 p-0 rounded-full flex items-center justify-center font-bold text-[10px] border-none shadow-none focus:ring-0', titularBg(t.titular))}><span>{titularInitials(t.titular)}▾</span></SelectTrigger>
                      <SelectContent><SelectItem value="Isabela">Isabela</SelectItem><SelectItem value="Claudio">Claudio</SelectItem><SelectItem value="Daniel">Daniel</SelectItem></SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-medium">{t.data}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Input value={t.nome} onChange={e => updateRow(t.id, { nome: e.target.value })} className="h-7 text-sm border-none shadow-none bg-transparent p-0 px-1 font-bold w-full max-w-md" />
                        {t.isSplit && (
                          <span className="shrink-0 text-[10px] font-bold uppercase text-violet-700 bg-violet-100 rounded-md px-2 py-0.5">
                            Divisão {t.splitIndex + 1}/{t.splitCount}
                          </span>
                        )}
                        <button
                          onClick={() => openSplit(t)}
                          title="Dividir valor entre cidades"
                          className="shrink-0 text-slate-400 hover:text-violet-600"
                        >
                          <SplitIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Select key={`cidade-${t.rowKey}-${t.cidade}`} value={t.cidade} onValueChange={v => t.isSplit ? updateSplitPart(t.id, t.splitIndex, { cidade: v }) : updateRow(t.id, { cidade: v })}><SelectTrigger className="h-6 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600"><SelectValue placeholder="Cidade" /></SelectTrigger><SelectContent>{['Araraquara','Bauru','Ribeirão Preto','São Carlos','Online','Não identificado','—'].map(c => (<SelectItem key={c} value={c} className="text-[11px]">{c}</SelectItem>))}</SelectContent></Select>
                        <Select key={`destino-${t.rowKey}-${t.destino}`} value={t.destino || ''} onValueChange={v => updateRow(t.id, { destino: v })}><SelectTrigger className="h-6 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600"><span>{t.destino === 'Cliente' && t.clienteNome ? `Cliente — ${t.clienteNome}` : (t.destino || 'Destino')}</span></SelectTrigger><SelectContent><SelectItem value="Loja" className="text-[11px]">Loja</SelectItem><SelectItem value="Depósito" className="text-[11px]">Depósito</SelectItem><SelectItem value="Cliente" className="text-[11px]">Cliente</SelectItem><SelectItem value="Fornecedor" className="text-[11px]">Fornecedor</SelectItem><SelectItem value="Serviço Digital" className="text-[11px]">Serviço Digital</SelectItem><SelectItem value="Encargo Bancário" className="text-[11px]">Encargo Bancário</SelectItem></SelectContent></Select>
                        {t.destino === 'Cliente' && (<Input placeholder="Nome do cliente" value={t.clienteNome || ''} onChange={e => updateRow(t.id, { clienteNome: e.target.value })} className="h-6 w-36 text-[11px] px-2 border-slate-200" />)}
                        {t.parcela && t.parcela !== '—' && (<span className="h-6 inline-flex items-center text-[11px] font-medium border border-slate-200 text-slate-500 rounded-md px-2">{t.parcela}</span>)}
                        {t.parcela && t.parcela !== '—' && prevTab && !t.isSplit && (
                          <button
                            onClick={() => herdarLinha(t)}
                            title={`Puxar detalhes desta parcela da fatura de ${prevTab}`}
                            className="h-6 inline-flex items-center gap-1 text-[11px] font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-md px-2"
                          >
                            <RefreshCw className="w-3 h-3" /> {prevTab}
                          </button>
                        )}

                      </div>
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 text-right font-bold tabular-nums text-base', t.tipo === 'Estorno' ? 'text-green-600' : '', t.tipo === 'Crédito' ? 'text-blue-600' : '')}>
                    {brl(t.valor)}
                    {t.isSplit && <span className="block text-[10px] font-normal text-slate-400">de {brl(t.valorOriginal)}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-400 bg-slate-50/50">{brl(t.saldoAcumulado)}</td>
                </tr>
                {splitTargetId === t.id && t.splitIndex <= 0 && (
                  <tr className="border-b bg-violet-50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="flex flex-col gap-3">
                        <p className="text-[11px] font-bold uppercase text-violet-700">
                          Dividir {t.nome} — valor total {brl(splitTotalOriginal)}
                        </p>
                        <div className="flex flex-col gap-2">
                          {splitDraft.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Select value={d.cidade} onValueChange={v => setSplitDraft(prev => prev.map((p, idx) => idx === i ? { ...p, cidade: v } : p))}>
                                <SelectTrigger className="h-8 w-44 bg-white text-[12px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
                                <SelectContent>{CIDADES_FIXAS.map(c => <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>)}</SelectContent>
                              </Select>
                              <Select value={d.titular} onValueChange={v => setSplitDraft(prev => prev.map((p, idx) => idx === i ? { ...p, titular: v } : p))}>
                                <SelectTrigger className="h-8 w-32 bg-white text-[12px]"><SelectValue placeholder="Titular" /></SelectTrigger>
                                <SelectContent>{TITULARES_FIXOS.map(c => <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>)}</SelectContent>
                              </Select>
                              <Input
                                value={d.valor}
                                onChange={e => setSplitDraft(prev => prev.map((p, idx) => idx === i ? { ...p, valor: e.target.value } : p))}
                                className="h-8 w-28 bg-white text-right text-[12px]"
                                placeholder="0,00"
                              />
                              {splitDraft.length > 2 && (
                                <button className="text-slate-400 hover:text-red-600" onClick={() => setSplitDraft(prev => prev.filter((_, idx) => idx !== i))}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => setSplitDraft(prev => [...prev, { cidade: 'Araraquara', titular: t.titular, valor: splitDiff > 0 ? splitDiff.toFixed(2) : '0.00' }])}>
                            + Adicionar cidade
                          </Button>
                          <span className={cn('text-[12px] font-bold tabular-nums', Math.abs(splitDiff) < 0.01 ? 'text-green-600' : 'text-amber-600')}>
                            Soma: {brl(splitDraftTotal)} · Diferença: {brl(splitDiff)}
                          </span>
                          <div className="ml-auto flex gap-2">
                            {getEdit(activeTab, t.id).splits && (
                              <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => removeSplit(t.id)}>Remover divisão</Button>
                            )}
                            <Button variant="outline" size="sm" onClick={closeSplit}>Cancelar</Button>
                            <Button size="sm" onClick={saveSplit}>Salvar divisão</Button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
    </div>
  );
}


