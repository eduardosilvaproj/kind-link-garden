import { useState, useEffect, useMemo } from 'react';
import { TRANSACOES, TOTAL_FATURA } from '../data/transactions';
import { DEFAULT_CONFIG } from '../data/defaultConfig';
import { exportToXLSX } from '../lib/exportUtils';
import { Download, FileText, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type RowEdit = { titular?: string; cidade?: string; destino?: string; clienteNome?: string; conferido?: boolean; nome?: string; valor?: number; };
const CIDADES_FIXAS = ['Araraquara','Bauru','Ribeirão Preto','São Carlos','Online','Não identificado'];
const TITULARES_FIXOS = ['Isabela','Claudio','Daniel'];
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (v: number) => v > 0.009 || v < -0.009 ? brl(v) : '—';
const titularBg = (t: string) => { if (t === 'Isabela') return 'bg-amber-500 text-white'; if (t === 'Claudio') return 'bg-blue-500 text-white'; return 'bg-teal-500 text-white'; };
const titularInitials = (t: string) => { if (t === 'Isabela') return 'IS'; if (t === 'Claudio') return 'CL'; return 'DN'; };
const rowBg = (tipo: string, cidade: string) => { if (tipo === 'Encargo Bancário') return 'bg-red-50'; if (tipo === 'Crédito') return 'bg-blue-50'; if (tipo === 'Estorno') return 'bg-green-50'; if (cidade === 'Não identificado') return 'bg-amber-50'; return ''; };

export default function Index() {
  const config = DEFAULT_CONFIG;
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
  
  const updateRow = (id: number, patch: Partial<RowEdit>) => { setEdits(prev => { const key = String(id); return { ...prev, [key]: { ...prev[key], ...patch } }; }); };
  const updateBatch = (ids: number[], patch: Partial<RowEdit>) => { setEdits(prev => { const next = { ...prev }; ids.forEach(id => { const key = String(id); next[key] = { ...next[key], ...patch }; }); return next; }); };
  
  const rows = useMemo(() => {
    const raw = TRANSACOES.map(t => {
      const e = edits[String(t.id)] ?? {};
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
    
    const sorted = [...raw].sort((a,b) => a.titular.localeCompare(b.titular) || a.id - b.id);
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
  }, [edits]);

  const somaIsabela = useMemo(() => rows.filter(t => t.titular === 'Isabela' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.tipo !== 'Pagamento').reduce((s, t) => s + t.valor, 0), [rows]);
  const somaClaudio = useMemo(() => rows.filter(t => t.titular === 'Claudio' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.tipo !== 'Pagamento').reduce((s, t) => s + t.valor, 0), [rows]);
  const somaDaniel = useMemo(() => rows.filter(t => t.titular === 'Daniel' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.tipo !== 'Pagamento').reduce((s, t) => s + t.valor, 0), [rows]);
  const totalConferidos = useMemo(() => rows.filter(t => t.conferido).length, [rows]);
  
  const crossTab = useMemo(() => {
    const CIDADES = ['Araraquara','Bauru','Ribeirão Preto','São Carlos','Online','Não identificado'];
    const effective = TRANSACOES.map(t => {
      const e = edits[String(t.id)] ?? {};
      return {
        id: t.id,
        titular: e.titular !== undefined ? e.titular : t.titular,
        cidade:  e.cidade  !== undefined ? e.cidade  : t.cidade,
        tipo:    t.tipo,
        valor:   t.valor,
      };
    });
    return [...CIDADES, 'Encargos'].map(label => {
      const get = (tit: string) => effective
        .filter(t => {
          if (t.titular !== tit) return false;
          if (label === 'Encargos') return t.tipo === 'Encargo Bancário';
          return t.cidade === label && t.tipo !== 'Encargo Bancário';
        })
        .reduce((s, t) => s + t.valor, 0);
      const Isabela = get('Isabela');
      const Claudio = get('Claudio');
      const Daniel  = get('Daniel');
      return { label, Isabela, Claudio, Daniel, total: Isabela + Claudio + Daniel };
    });
  }, [edits]);

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

    // Total badge (green pill)
    pdf.setFillColor(220, 252, 231); // green-100
    pdf.roundedRect(120, 7, 52, 8, 2, 2, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(22, 101, 52); // green-800
    pdf.text(`TOTAL: ${brl(TOTAL_FATURA)} ✓`, 123, 12.5);

    // Conferidos badge
    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.roundedRect(175, 7, 45, 8, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105); // slate-500
    pdf.text(`✓ Conferidos: ${totalConferidos} / ${rows.length}`, 178, 12.5);

    // Export date top right
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')}`, W - 50, 13);

    // ── Metric cards row ──
    const cards = [
      { label: 'ISABELA (LÍQUIDO)', value: brl(somaIsabela), color: [251, 191, 36] as [number,number,number] },
      { label: 'CLAUDIO (LÍQUIDO)', value: brl(somaClaudio), color: [59, 130, 246] as [number,number,number] },
      { label: 'DANIEL (ADICIONAL)', value: brl(somaDaniel), color: [20, 184, 166] as [number,number,number] },
      { label: 'TOTAL FATURA', value: brl(TOTAL_FATURA), color: [255, 255, 255] as [number,number,number], dark: true },
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
        0: { cellWidth: 50 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 0) {
          if (d.cell.text[0] === 'Não identificado') d.cell.styles.fillColor = [255, 249, 196];
          if (d.cell.text[0] === 'Encargos') d.cell.styles.fillColor = [254, 226, 226];
        }
      },
    });

    // ── Transactions table ──
    const body = rows
      .filter(t => t.tipo !== 'Crédito' && t.tipo !== 'Pagamento')
      .map(t => [
        String(t.id),
        t.conferido ? '✓' : '',
        t.titular,
        t.data,
        t.nome,
        t.cidade,
        t.destino === 'Cliente' && t.clienteNome ? `Cliente — ${t.clienteNome}` : (t.destino || t.tipo),
        t.parcela || '—',
        brl(Math.abs(t.valor)),
      ]);

    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 6,
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
      head: [['#', '✓', 'Titular', 'Data', 'Estabelecimento', 'Cidade', 'Destino', 'Parc.', 'Valor']],
      body,
      rowPageBreak: 'avoid',
      pageBreak: 'auto',
      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [31, 56, 100], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 8,  halign: 'center' },
        2: { cellWidth: 24 },
        3: { cellWidth: 16 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 36 },
        6: { cellWidth: 34 },
        7: { cellWidth: 14, halign: 'center' },
        8: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
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
          pdf.text('Classificador de Fatura C6 Bank — Abril 2026', 10, 5.5);
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

    pdf.save('Fatura_C6_Abril_2026.pdf');
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">Classificador de Fatura C6 Bank</h1>
            <Badge className="text-[10px] font-bold uppercase px-3 py-1 bg-green-100 text-green-700 border-green-200">Total: {brl(TOTAL_FATURA)} ✓</Badge>
            <Badge variant="outline" className="text-[10px] font-bold uppercase px-3 py-1">✓ Conferidos: {totalConferidos} / {rows.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToXLSX(rows, config)} className="gap-2"><Download className="w-4 h-4" /> Exportar Excel</Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2"><FileText className="w-4 h-4" /> Exportar PDF</Button>
          </div>
        </header>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border shadow-sm p-4"><p className="text-xs font-bold text-slate-500 uppercase mb-1">Isabela (Líquido)</p><p className="text-2xl font-black text-amber-600">{brl(somaIsabela)}</p></div>
          <div className="bg-white rounded-xl border shadow-sm p-4"><p className="text-xs font-bold text-slate-500 uppercase mb-1">Claudio (Líquido)</p><p className="text-2xl font-black text-blue-600">{brl(somaClaudio)}</p></div>
          <div className="bg-white rounded-xl border shadow-sm p-4"><p className="text-xs font-bold text-slate-500 uppercase mb-1">Daniel (Adicional)</p><p className="text-2xl font-black text-teal-600">{brl(somaDaniel)}</p></div>
          <div className="bg-slate-900 rounded-xl shadow-sm p-4"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Fatura</p><p className="text-2xl font-black text-white">{brl(TOTAL_FATURA)}</p></div>
        </div>
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
                    row.label === 'Não identificado' && row.total > 0 ? 'border-t bg-amber-50' :
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
                <tr key={t.id} className={cn('border-b transition-colors', rowBg(t.tipo, t.cidade), t.conferido ? 'border-l-4 border-l-green-600' : '')}>
                  <td className="px-2 py-3 text-center text-[11px] text-slate-400 font-mono">{t.id}</td>
                  <td className="px-2 py-3 text-center"><input type="checkbox" className="w-4 h-4 rounded accent-green-600" checked={!!t.conferido} onChange={e => updateRow(t.id, { conferido: e.target.checked })} /></td>
                  <td className="px-4 py-3"><Select value={t.titular} onValueChange={v => updateRow(t.id, { titular: v })}><SelectTrigger className={cn('w-10 h-8 p-0 rounded-full flex items-center justify-center font-bold text-[10px] border-none shadow-none focus:ring-0', titularBg(t.titular))}><span>{titularInitials(t.titular)}▾</span></SelectTrigger><SelectContent><SelectItem value="Isabela">Isabela</SelectItem><SelectItem value="Claudio">Claudio</SelectItem><SelectItem value="Daniel">Daniel</SelectItem></SelectContent></Select></td>
                  <td className="px-4 py-3 text-slate-500 font-medium">{t.data}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Input value={t.nome} onChange={e => updateRow(t.id, { nome: e.target.value })} className="h-7 text-sm border-none shadow-none bg-transparent p-0 px-1 font-bold w-full max-w-md" />
                      <div className="flex gap-2 items-center flex-wrap">
                        <Select value={t.cidade} onValueChange={v => updateRow(t.id, { cidade: v })}><SelectTrigger className="h-6 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600"><SelectValue placeholder="Cidade" /></SelectTrigger><SelectContent>{['Araraquara','Bauru','Ribeirão Preto','São Carlos','Online','Não identificado','—'].map(c => (<SelectItem key={c} value={c} className="text-[11px]">{c}</SelectItem>))}</SelectContent></Select>
                        <Select value={t.destino || ''} onValueChange={v => updateRow(t.id, { destino: v })}><SelectTrigger className="h-6 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600"><span>{t.destino === 'Cliente' && t.clienteNome ? `Cliente — ${t.clienteNome}` : (t.destino || 'Destino')}</span></SelectTrigger><SelectContent><SelectItem value="Loja" className="text-[11px]">Loja</SelectItem><SelectItem value="Depósito" className="text-[11px]">Depósito</SelectItem><SelectItem value="Cliente" className="text-[11px]">Cliente</SelectItem><SelectItem value="Fornecedor" className="text-[11px]">Fornecedor</SelectItem><SelectItem value="Serviço Digital" className="text-[11px]">Serviço Digital</SelectItem><SelectItem value="Encargo Bancário" className="text-[11px]">Encargo Bancário</SelectItem></SelectContent></Select>
                        {t.destino === 'Cliente' && (<Input placeholder="Nome do cliente" value={t.clienteNome || ''} onChange={e => updateRow(t.id, { clienteNome: e.target.value })} className="h-6 w-36 text-[11px] px-2 border-slate-200" />)}
                        {t.parcela && t.parcela !== '—' && (<span className="h-6 inline-flex items-center text-[11px] font-medium border border-slate-200 text-slate-500 rounded-md px-2">{t.parcela}</span>)}
                      </div>
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 text-right font-bold tabular-nums text-base', t.tipo === 'Estorno' ? 'text-green-600' : '', t.tipo === 'Crédito' ? 'text-blue-600' : '')}>{brl(t.valor)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-400 bg-slate-50/50">{brl(t.saldoAcumulado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
