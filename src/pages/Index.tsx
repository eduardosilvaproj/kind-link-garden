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
const titularBg = (t: string) => { if (t === 'Isabela') return 'bg-amber-500'; if (t === 'Claudio') return 'bg-blue-500'; return 'bg-teal-500'; };
const titularInitials = (t: string) => { if (t === 'Isabela') return 'IS'; if (t === 'Claudio') return 'CL'; return 'DN'; };

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
    
    // Sort by titular to make accumulation work
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader><CardTitle className="text-sm">Isabela</CardTitle></CardHeader><CardContent className="text-xl font-bold">{brl(somaIsabela)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Claudio</CardTitle></CardHeader><CardContent className="text-xl font-bold">{brl(somaClaudio)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Daniel</CardTitle></CardHeader><CardContent className="text-xl font-bold">{brl(somaDaniel)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Conferidos</CardTitle></CardHeader><CardContent className="text-xl font-bold">{totalConferidos}/{rows.length}</CardContent></Card>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titular</TableHead>
            <TableHead>Estabelecimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Acumulado</TableHead>
            <TableHead>Conferido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtradas.map(t => (
            <TableRow key={t.id}>
              <TableCell>{t.titular}</TableCell>
              <TableCell>{t.nome}</TableCell>
              <TableCell>{brl(t.valor)}</TableCell>
              <TableCell>{brl(t.saldoAcumulado)}</TableCell>
              <TableCell><input type="checkbox" checked={t.conferido} onChange={(e) => updateRow(t.id, { conferido: e.target.checked })} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
