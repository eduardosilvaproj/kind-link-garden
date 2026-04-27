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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, CartesianGrid } from 'recharts';

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
  const [edits, setEdits] = useState<Record<string, RowEdit>>(() => { try { const raw = localStorage.getItem('fatura_edits_v3'); return raw ? JSON.parse(raw) : {}; } catch { return {}; } });
  
  useEffect(() => { localStorage.setItem('fatura_edits_v3', JSON.stringify(edits)); }, [edits]);
  
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

  const somaIsabela = useMemo(() => rows.filter(t => t.titular === 'Isabela' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.valor > 0).reduce((s, t) => s + t.valor, 0), [rows]);
  const somaClaudio = useMemo(() => rows.filter(t => t.titular === 'Claudio' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.valor > 0).reduce((s, t) => s + t.valor, 0), [rows]);
  const somaDaniel = useMemo(() => rows.filter(t => t.titular === 'Daniel' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.valor > 0).reduce((s, t) => s + t.valor, 0), [rows]);
  const totalConferidos = useMemo(() => rows.filter(t => t.conferido).length, [rows]);
  
  const crossTab = useMemo(() => [...CIDADES_FIXAS, 'Encargos'].map(label => {
    const cols: Record<string, number> = {};
    TITULARES_FIXOS.forEach(tit => {
      cols[tit] = rows.filter(t => {
        if (t.titular !== tit) return false;
        if (t.tipo === 'Crédito' || t.tipo === 'Estorno') return false;
        if (label === 'Encargos') return t.tipo === 'Encargo Bancário';
        return t.cidade === label && t.tipo !== 'Encargo Bancário';
      }).reduce((s, t) => s + t.valor, 0);
    });
    return { label, ...cols, total: TITULARES_FIXOS.reduce((s, tit) => s + cols[tit], 0) };
  }), [rows]);

  const filtradas = useMemo(() => rows.filter(t => {
    if (filterTitular !== 'Todos' && t.titular !== filterTitular) return false;
    if (showPendentes && t.cidade !== 'Não identificado') return false;
    if (!showPagamentos && (t.tipo === 'Crédito' || t.tipo === 'Pagamento')) return false;
    return true;
  }), [rows, filterTitular, showPendentes, showPagamentos]);

  const exportPDF = async () => {
    const pdf = new jsPDF({ orientation: 'landscape' });
    pdf.text('Fatura C6 - Abril 2026', 14, 15);
    autoTable(pdf, {
      startY: 20,
      head: [['Cidade', 'Isabela', 'Claudio', 'Daniel', 'Total']],
      body: crossTab.map(r => [r.label, fmt(r.Isabela), fmt(r.Claudio), fmt(r.Daniel), fmt(r.total)])
    });
    pdf.save('Fatura_C6.pdf');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        <header className="bg-white border p-4 rounded-xl shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Classificador C6</h1>
            <Badge variant="outline">Total Fatura: {brl(TOTAL_FATURA)}</Badge>
            <Badge variant="outline">Conferidos: {totalConferidos}/{rows.length}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportToXLSX(rows, config)}><Download className="w-4 h-4 mr-2"/>Excel</Button>
            <Button size="sm" variant="outline" onClick={exportPDF}><FileText className="w-4 h-4 mr-2"/>PDF</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[{id:'Isabela',val:somaIsabela,c:'bg-amber-500'},{id:'Claudio',val:somaClaudio,c:'bg-blue-500'},{id:'Daniel',val:somaDaniel,c:'bg-teal-500'}].map(tit=>(
            <Card key={tit.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", tit.c)}>{titularInitials(tit.id)}</div>
                <div><p className="text-xs text-slate-500 font-bold uppercase">{tit.id}</p><p className="text-lg font-black">{brl(tit.val)}</p></div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-slate-900 text-white"><CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center"><FileText className="w-5 h-5"/></div>
            <div><p className="text-xs text-slate-400 font-bold uppercase">Total Geral</p><p className="text-lg font-black">{brl(TOTAL_FATURA)}</p></div>
          </CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <Table>
              <TableHeader><TableRow className="bg-slate-50"><TableHead>Cidade</TableHead><TableHead className="text-right">Isabela</TableHead><TableHead className="text-right">Claudio</TableHead><TableHead className="text-right">Daniel</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {crossTab.map((r,i)=>(
                  <TableRow key={i} className={cn(r.label==='Não identificado'&&'bg-amber-50')}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right">{fmt(r.Isabela)}</TableCell><TableCell className="text-right">{fmt(r.Claudio)}</TableCell><TableCell className="text-right">{fmt(r.Daniel)}</TableCell><TableCell className="text-right font-bold">{brl(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-bold uppercase mb-4 text-slate-500">Gastos por Cidade</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={crossTab.filter(r=>r.total>0)} layout="vertical">
                  <XAxis type="number" hide/><YAxis dataKey="label" type="category" width={80} style={{fontSize:'10px'}}/><RechartsTooltip formatter={(v:any)=>brl(v)}/><Bar dataKey="total" fill="#3b82f6" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
            <div className="flex gap-4">
              <Select value={filterTitular} onValueChange={setFilterTitular}>
                <SelectTrigger className="w-40 h-8 bg-white"><Filter className="w-3 h-3 mr-2"/> {filterTitular}</SelectTrigger>
                <SelectContent><SelectItem value="Todos">Todos</SelectItem>{TITULARES_FIXOS.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-2 border rounded bg-white h-8"><Switch id="p" checked={showPendentes} onCheckedChange={setShowPendentes} className="scale-75"/><Label htmlFor="p" className="text-[10px] font-bold">PENDENTES</Label></div>
              <div className="flex items-center gap-2 px-2 border rounded bg-white h-8"><Switch id="pay" checked={showPagamentos} onCheckedChange={setShowPagamentos} className="scale-75"/><Label htmlFor="pay" className="text-[10px] font-bold">PAGAMENTOS</Label></div>
            </div>
            <span className="text-xs font-bold text-slate-400">{filtradas.length} transações</span>
          </div>
          <Table>
            <TableHeader><TableRow className="text-[10px] uppercase bg-slate-50"><TableHead className="w-8">#</TableHead><TableHead className="w-8">✓</TableHead><TableHead>Titular</TableHead><TableHead>Estabelecimento</TableHead><TableHead>Cidade</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right bg-slate-100/50">Acumulado</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtradas.map(t=>(
                <TableRow key={t.id} className={cn(rowBg(t.tipo, t.cidade))}>
                  <TableCell className="text-[10px] text-slate-400 font-mono">{t.id}</TableCell>
                  <TableCell><input type="checkbox" checked={t.conferido} onChange={e=>updateRow(t.id,{conferido:e.target.checked})} className="accent-green-600"/></TableCell>
                  <TableCell>
                    <Select value={t.titular} onValueChange={v=>updateRow(t.id,{titular:v})}>
                      <SelectTrigger className="h-7 w-24 text-[10px] font-bold"><div className={cn("w-4 h-4 rounded-full mr-2", titularBg(t.titular))}></div>{t.titular}</SelectTrigger>
                      <SelectContent>{TITULARES_FIXOS.map(tit=><SelectItem key={tit} value={tit}>{tit}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={t.nome} onChange={e=>updateRow(t.id,{nome:e.target.value})} className="h-7 text-xs font-bold"/></TableCell>
                  <TableCell>
                    <Select value={t.cidade} onValueChange={v=>updateRow(t.id,{cidade:v})}>
                      <SelectTrigger className="h-7 w-32 text-[10px]"><SelectValue/></SelectTrigger>
                      <SelectContent>{CIDADES_FIXAS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    <Input defaultValue={t.valor} onBlur={e=>{const v=parseFloat(e.target.value); if(!isNaN(v))updateRow(t.id,{valor:v});}} className="h-7 w-24 text-right text-xs font-bold ml-auto"/>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-500 bg-slate-50/50">{brl(t.saldoAcumulado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
