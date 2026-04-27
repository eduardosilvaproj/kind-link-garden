 import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRANSACOES, TOTAL_FATURA } from '../data/transactions';
import { Download, FileText, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Transacao } from "../types";
import { cn } from "@/lib/utils";
import { exportToXLSX } from "../lib/exportUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
 import jsPDF from 'jspdf';
 import autoTable from 'jspdf-autotable';

  const Index = () => {
    const { config } = useAppContext();
    const [filterTitular, setFilterTitular] = useState<string>("Todos");
    const [showOnlyUnidentified, setShowOnlyUnidentified] = useState(false);
    const [showPayments, setShowPayments] = useState(false);
  
    // 1. SINGLE SOURCE OF TRUTH
    const [edits, setEdits] = useState<Record<string, {
      titular?: string;
      cidade?: string;
      destino?: string;
      clienteNome?: string;
      conferido?: boolean;
      nome?: string;
    }>>(() => {
      try {
        const raw = localStorage.getItem('fatura_edits');
        return raw ? JSON.parse(raw) : {};
      } catch { return {}; }
    });
  
    // Save to localStorage on every change
    useEffect(() => {
      localStorage.setItem('fatura_edits', JSON.stringify(edits));
    }, [edits]);
  
    // Update a single row
    const updateRow = (id: number, patch: object) => {
      setEdits(prev => ({
        ...prev,
        [`${id}`]: { ...prev[`${id}`], ...patch }
      }));
    };
  
    const updateBatchRows = (ids: number[], patch: object) => {
      setEdits(prev => {
        const next = { ...prev };
        ids.forEach(id => {
          next[`${id}`] = { ...next[`${id}`], ...patch };
        });
        return next;
      });
    };
  
    // 2. EFFECTIVE LIST — merge edits over base data
    const rows = useMemo(() =>
      TRANSACOES.map(t => {
        const e = edits[`${t.id}`] ?? {};
        return {
          ...t,
          titular:     e.titular     ?? t.titular,
          cidade:      e.cidade      ?? t.cidade,
          destino:     e.destino     ?? t.destino,
          clienteNome: e.clienteNome ?? t.clienteNome ?? '',
          conferido:   e.conferido   ?? false,
          nome:        e.nome        ?? t.nome,
        };
      }),
    [edits]);
  
    // 3. CARD TOTALS — always from rows
    const somaIsabela = useMemo(() =>
      rows
        .filter(t => t.titular === 'Isabela' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.valor > 0)
        .reduce((s, t) => s + t.valor, 0),
    [rows]);
  
    const somaClaudio = useMemo(() =>
      rows
        .filter(t => t.titular === 'Claudio' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.valor > 0)
        .reduce((s, t) => s + t.valor, 0),
    [rows]);
  
    const somaDaniel = useMemo(() =>
      rows
        .filter(t => t.titular === 'Daniel' && t.tipo !== 'Crédito' && t.tipo !== 'Estorno' && t.valor > 0)
        .reduce((s, t) => s + t.valor, 0),
    [rows]);
  
    const totalConferidos = useMemo(() =>
      rows.filter(t => t.conferido).length,
    [rows]);
  
    const totals = useMemo(() => ({
      isabela: somaIsabela,
      claudio: somaClaudio,
      daniel: somaDaniel,
      totalCalculado: TOTAL_FATURA,
      conferidos: totalConferidos
    }), [somaIsabela, somaClaudio, somaDaniel, totalConferidos]);

  const isValid = Math.abs(totals.totalCalculado - 11019.68) < 0.01;

  const crossTable = useMemo(() => {
    const rowLabels = ["Araraquara", "Bauru", "Ribeirão Preto", "São Carlos", "Online", "Não identificado", "Encargos"];
    const titularIds = ["Isabela", "Claudio", "Daniel"];
    
    return rowLabels.map(label => {
      const row: any = { label };
      let total = 0;
      titularIds.forEach(titularId => {
        let val = 0;
        if (label === 'Encargos') {
          val = transacoesEfetivas
            .filter(t => t.titular === titularId && t.tipo === 'Encargo Bancário')
            .reduce((acc, t) => acc + t.valor, 0);
        } else {
          val = transacoesEfetivas
            .filter(t => 
              t.titular === titularId &&
              (label === "Online" ? (t.cidade === "Online" || t.cidade === "Online / Digital") : t.cidade === label) &&
              t.tipo !== "Crédito" &&
              t.tipo !== "Estorno" &&
              t.tipo !== "Pagamento" &&
              t.tipo !== "Encargo Bancário" &&
              t.valor > 0
            )
            .reduce((acc, t) => acc + t.valor, 0);
        }
        row[titularId] = val;
        total += val;
      });
      row.total = total;
      return row;
    });
  }, [transacoesEfetivas]);

  const filteredTransacoes = useMemo(() => {
    return transacoesEfetivas.filter(t => {
      if (filterTitular !== "Todos" && t.titular !== filterTitular) return false;
      if (showOnlyUnidentified && t.cidade !== "Não identificado") return false;
      if (!showPayments && (t.tipo === "Pagamento" || t.tipo === "Crédito")) return false;
      return true;
    });
  }, [transacoesEfetivas, filterTitular, showOnlyUnidentified, showPayments]);

  const getTitularColor = (id: string) => {
    const lower = id.toLowerCase();
    if (lower === "isabela") return "bg-amber-500 text-white";
    if (lower === "claudio") return "bg-blue-500 text-white";
    if (lower === "daniel") return "bg-teal-500 text-white";
    return "bg-slate-500 text-white";
  };

   const getTitularInitials = (id: string) => {
     const lower = id.toLowerCase();
     if (lower === "isabela") return "IS";
     if (lower === "claudio") return "CL";
     if (lower === "daniel") return "DN";
     return "??";
   };

  const getRowColor = (t: Transacao) => {
    const isUnidentified = t.cidade === "Não identificado";
    if (t.tipo === "Encargo Bancário") return "bg-red-50 text-red-700";
    if (isUnidentified) return "bg-amber-50 text-amber-700";
    if (t.tipo === "Crédito") return "bg-blue-50 text-blue-700";
    if (t.tipo === "Estorno") return "bg-green-50 text-green-700";
    return "";
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

   const fmt = (v: number) =>
     v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
 
   const exportPDF = async () => {
     const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
     
     pdf.setFontSize(14);
     pdf.setFont('helvetica', 'bold');
     pdf.text('Classificador de Fatura C6 Bank — Abril 2026', 14, 16);
     pdf.setFontSize(10);
     pdf.setFont('helvetica', 'normal');
     pdf.text(`Total Fatura: R$ ${totals.totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 23);
     pdf.text(`Isabela: ${fmt(totals.isabela)}   Claudio: ${fmt(totals.claudio)}   Daniel: ${fmt(totals.daniel)}`, 14, 29);
 
     autoTable(pdf, {
       startY: 34,
       head: [['Cidade', 'Isabela', 'Claudio', 'Daniel', 'Total']],
       body: crossTable.map(row => [
         row.label,
         fmt(row.Isabela),
         fmt(row.Claudio),
         fmt(row.Daniel),
         fmt(row.total)
       ]),
       foot: [['TOTAL', fmt(crossTable.reduce((acc, r) => acc + r.Isabela, 0)), fmt(crossTable.reduce((acc, r) => acc + r.Claudio, 0)), fmt(crossTable.reduce((acc, r) => acc + r.Daniel, 0)), fmt(crossTable.reduce((acc, r) => acc + r.total, 0))]],
       styles: { fontSize: 9, cellPadding: 3 },
       headStyles: { fillColor: [31, 56, 100], textColor: 255, fontStyle: 'bold' },
       footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' },
       columnStyles: {
         0: { cellWidth: 45 },
         1: { halign: 'right' },
         2: { halign: 'right' },
         3: { halign: 'right' },
         4: { halign: 'right', fontStyle: 'bold' },
       },
     });
 
     const tableBody = transacoesEfetivas
       .filter(t => t.tipo !== 'Crédito' && t.tipo !== 'Pagamento')
       .map(t => [
         String(t.id),
         t.conferido ? '✓' : '',
         t.titular,
         t.data,
         t.nome,
         t.cidade,
         t.destino || t.tipo,
         t.parcela || '—',
         `R$ ${Math.abs(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
       ]);
 
     autoTable(pdf, {
       startY: (pdf as any).lastAutoTable.finalY + 8,
       head: [['#', '✓', 'Titular', 'Data', 'Estabelecimento', 'Cidade', 'Destino', 'Parc.', 'Valor']],
       body: tableBody,
       styles: { 
         fontSize: 8, 
         cellPadding: 2, 
         overflow: 'linebreak',
         cellWidth: 'wrap',
       },
       rowPageBreak: 'avoid',
       pageBreak: 'auto',
       headStyles: { fillColor: [31, 56, 100], textColor: 255, fontStyle: 'bold' },
       alternateRowStyles: { fillColor: [248, 248, 248] },
       columnStyles: {
         0: { cellWidth: 8,  halign: 'center' },
         1: { cellWidth: 8,  halign: 'center' },
         2: { cellWidth: 22 },
         3: { cellWidth: 16 },
         4: { cellWidth: 60 },
         5: { cellWidth: 32 },
         6: { cellWidth: 28 },
         7: { cellWidth: 14, halign: 'center' },
         8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
       },
       didParseCell: (data) => {
         const row = tableBody[data.row.index];
         if (!row) return;
         const titular = row[2];
         if (data.section === 'body') {
           if (titular === 'Isabela') data.cell.styles.textColor = [180, 100, 0];
           if (titular === 'Claudio') data.cell.styles.textColor = [0, 80, 160];
           if (titular === 'Daniel')  data.cell.styles.textColor = [0, 120, 80];
         }
       },
       didDrawPage: (data) => {
         const pageCount = pdf.getNumberOfPages();
         pdf.setFontSize(8);
         pdf.text(
           `Página ${data.pageNumber} de ${pageCount}`,
           pdf.internal.pageSize.getWidth() - 30,
           pdf.internal.pageSize.getHeight() - 5
         );
       },
     });
 
     pdf.save('Fatura_C6_Abril_2026.pdf');
   };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <div id="pdf-content" className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
        {/* HEADER */}
        <header className="py-4 flex justify-between items-center bg-white border b rounded-xl px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Classificador de Fatura C6 Bank</h1>
            <Badge className={cn("text-[10px] font-bold uppercase px-3 py-1", isValid ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")}>
               Total calculado: {formatBRL(totals.totalCalculado)} {isValid ? '✓' : '✗'}
             </Badge>
             <Badge variant="outline" className="text-[10px] font-bold uppercase px-3 py-1 bg-white border-slate-200 text-slate-600">
               ✓ Conferidos: {checkedCount} / {transacoesEfetivas.length}
             </Badge>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={() => exportToXLSX(transacoesEfetivas, config)} className="flex gap-2 no-print">
              <Download className="w-4 h-4" /> Exportar Excel
            </Button>
             <Button variant="outline" size="sm" onClick={exportPDF} className="flex gap-2 no-print">
              <FileText className="w-4 h-4" /> Exportar PDF
            </Button>
          </div>
        </header>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Isabela (Líquido)</p>
              <p className="text-2xl font-black text-amber-600">{formatBRL(totals.isabela)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Claudio (Líquido)</p>
              <p className="text-2xl font-black text-blue-600">{formatBRL(totals.claudio)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Daniel (Adicional)</p>
              <p className="text-2xl font-black text-teal-600">{formatBRL(totals.daniel)}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 text-white">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">TOTAL FATURA</p>
              <p className="text-2xl font-black">{formatBRL(totals.totalCalculado)}</p>
            </CardContent>
          </Card>
        </div>

        {/* SUMMARY TABLE */}
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-6 border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold uppercase text-slate-500">Distribuição Cidade × Titular</CardTitle>
          </CardHeader>
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-bold text-[11px] uppercase px-6 h-10">Cidade</TableHead>
                <TableHead className="text-right font-bold text-[11px] uppercase px-6 h-10">Isabela</TableHead>
                <TableHead className="text-right font-bold text-[11px] uppercase px-6 h-10">Claudio</TableHead>
                <TableHead className="text-right font-bold text-[11px] uppercase px-6 h-10">Daniel</TableHead>
                <TableHead className="text-right font-bold bg-slate-100/50 text-[11px] uppercase px-6 h-10">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossTable.map((row, idx) => (
                <TableRow key={idx} className={cn(row.label === 'Não identificado' && row.total > 0 ? 'bg-amber-50' : row.label === 'Encargos' ? 'bg-red-50' : '')}>
                  <TableCell className="font-medium text-[12px] px-6 py-2">{row.label}</TableCell>
                  <TableCell className="text-right tabular-nums text-[12px] px-6 py-2">{row.Isabela > 0.01 ? formatBRL(row.Isabela) : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-[12px] px-6 py-2">{row.Claudio > 0.01 ? formatBRL(row.Claudio) : '—'}</TableCell>
                  <TableCell className="text-right tabular-nums text-[12px] px-6 py-2">{row.Daniel > 0.01 ? formatBRL(row.Daniel) : '—'}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums bg-slate-50 text-[12px] px-6 py-2">{formatBRL(row.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-100 font-black">
                <TableCell className="px-6 py-3 text-[12px]">TOTAL</TableCell>
                <TableCell className="text-right tabular-nums text-[12px] px-6 py-3">{formatBRL(crossTable.reduce((acc, r) => acc + r.Isabela, 0))}</TableCell>
                <TableCell className="text-right tabular-nums text-[12px] px-6 py-3">{formatBRL(crossTable.reduce((acc, r) => acc + r.Claudio, 0))}</TableCell>
                <TableCell className="text-right tabular-nums text-[12px] px-6 py-3">{formatBRL(crossTable.reduce((acc, r) => acc + r.Daniel, 0))}</TableCell>
                <TableCell className="text-right tabular-nums bg-slate-200 text-[12px] px-6 py-3">{formatBRL(crossTable.reduce((acc, r) => acc + r.total, 0))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        {/* TRANSACTION LIST */}
        <div className="flex flex-col gap-4">
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-6 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <Select value={filterTitular} onValueChange={setFilterTitular}>
                  <SelectTrigger className="h-8 w-[140px] bg-white">
                    <Filter className="w-3 h-3 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos Titulares</SelectItem>
                    {config.titulares.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border h-8">
                  <Switch id="unidentified" checked={showOnlyUnidentified} onCheckedChange={setShowOnlyUnidentified} className="scale-75" />
                  <Label htmlFor="unidentified" className="text-[11px] font-bold uppercase cursor-pointer">Pendentes</Label>
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border h-8">
                  <Switch id="payments" checked={showPayments} onCheckedChange={setShowPayments} className="scale-75" />
                  <Label htmlFor="payments" className="text-[11px] font-bold uppercase cursor-pointer">Pagamentos</Label>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">{filteredTransacoes.length} transações</span>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] uppercase text-slate-500 bg-slate-50/50">
                   <TableHead className="w-[36px] px-2 text-center text-[10px]">#</TableHead>
                   <TableHead className="w-[40px] px-2 text-center">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4 rounded border-slate-300"
                       checked={filteredTransacoes.length > 0 && filteredTransacoes.every(t => t.conferido)}
                       onChange={(e) => {
                         const checked = e.target.checked;
                         const ids = filteredTransacoes.map(t => t.id);
                          updateBatchRows(ids, { conferido: checked });
                       }}
                     />
                   </TableHead>
                   <TableHead className="w-[100px] px-6">Titular</TableHead>
                  <TableHead className="w-[100px] px-6">Data</TableHead>
                  <TableHead className="px-6">Estabelecimento & Classificação</TableHead>
                  <TableHead className="text-right px-6 w-[150px]">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredTransacoes.map((t) => (
                   <TableRow key={t.id} className={cn("group text-sm transition-colors", getRowColor(t), t.conferido && "border-l-[3px] border-l-[#198754]")}>
                     <TableCell className="px-2 py-3 text-center text-[11px] text-slate-400 font-mono">
                       {t.id}
                     </TableCell>
                     <TableCell className="px-2 py-3 text-center">
                       <input 
                         type="checkbox" 
                         className="w-4 h-4 rounded border-slate-300 accent-[#198754]"
                         checked={!!t.conferido}
                          onChange={(e) => updateRow(t.id, { conferido: e.target.checked })}
                       />
                     </TableCell>
                     <TableCell className="px-6 py-3">
                        <Select value={t.titular} onValueChange={(v) => updateRow(t.id, { titular: v })}>
                         <SelectTrigger className={cn("w-10 h-8 p-0 rounded-full flex items-center justify-center font-bold text-[10px] border-none shadow-none focus:ring-0", getTitularColor(t.titular))}>
                           <SelectValue>{getTitularInitials(t.titular)}▾</SelectValue>
                         </SelectTrigger>
                         <SelectContent>
                           {config.titulares.map(tit => (
                             <SelectItem key={tit.id} value={tit.id} className="text-xs font-bold">
                               {tit.nome}
                             </SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </TableCell>
                    <TableCell className="px-6 py-3 font-medium text-slate-500">{t.data}</TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="flex flex-col gap-2">
                        <Input 
                          value={t.nome} 
                           onChange={(e) => updateRow(t.id, { nome: e.target.value })}
                          className="h-7 text-sm border-none shadow-none bg-transparent hover:bg-white focus:bg-white p-0 px-1 font-bold w-full max-w-md"
                        />
                        <div className="flex gap-2 items-center">
                           <Select value={t.cidade} onValueChange={(v) => updateRow(t.id, { cidade: v })}>
                            <SelectTrigger className="h-6 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600 font-medium">
                              <SelectValue placeholder="Cidade" />
                            </SelectTrigger>
                            <SelectContent>
                              {["Araraquara", "Bauru", "Ribeirão Preto", "São Carlos", "Online", "Não identificado", "—"].map(c => (
                                <SelectItem key={c} value={c} className="text-[11px]">{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                           <Select value={t.destino || ""} onValueChange={(v) => updateRow(t.id, { destino: v })}>
                            <SelectTrigger className="h-6 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600 font-medium">
                              <span>{t.destino === "Cliente" && t.clienteNome ? `Cliente — ${t.clienteNome}` : (t.destino || "Destino")}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Loja" className="text-[11px]">Loja</SelectItem>
                              <SelectItem value="Depósito" className="text-[11px]">Depósito</SelectItem>
                              <SelectItem value="Cliente" className="text-[11px]">Cliente</SelectItem>
                            </SelectContent>
                          </Select>

                          {t.destino === "Cliente" && (
                            <Input
                              placeholder="Nome"
                              value={t.clienteNome || ""}
                               onChange={(e) => updateRow(t.id, { clienteNome: e.target.value })}
                              className="h-6 w-32 text-[11px] px-2 border-slate-200"
                            />
                          )}

                          {t.parcela && t.parcela !== "—" && (
                            <Badge variant="outline" className="h-6 text-[11px] font-medium border-slate-200 text-slate-500 rounded-md px-2">
                              {t.parcela}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn("px-6 py-3 text-right font-bold tabular-nums text-base", t.tipo === "Estorno" ? "text-green-600" : "")}>
                      {formatBRL(t.valor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
