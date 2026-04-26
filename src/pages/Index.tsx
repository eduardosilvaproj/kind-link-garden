import { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SAMPLE_TRANSACTIONS } from '../data/sampleData';
import { Download, AlertCircle, Filter, FilterX, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Cidade, TipoDestino, Transacao } from "../types";
import { cn } from "@/lib/utils";
import { exportToXLSX } from "../lib/exportUtils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Index = () => {
  const { transacoes, setTransacoes, config, updateTransacao } = useAppContext();
  const [filterTitular, setFilterTitular] = useState<string>("Todos");
  const [showOnlyUnidentified, setShowOnlyUnidentified] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  // Initialize with all data if empty (as requested)
  if (transacoes.length === 0) {
    setTransacoes(SAMPLE_TRANSACTIONS);
  }

  const totals = useMemo(() => {
    const compras = transacoes.filter(t => ['Loja', 'Fornecedor', 'Serviço Digital', 'Depósito', 'Cliente'].includes(t.tipo)).reduce((acc, t) => acc + t.valor, 0);
    const encargos = transacoes.filter(t => t.tipo === 'Encargo Bancário').reduce((acc, t) => acc + t.valor, 0);
    const creditos = transacoes.filter(t => t.tipo === 'Crédito').reduce((acc, t) => acc + t.valor, 0);
    const estornos = transacoes.filter(t => t.tipo === 'Estorno').reduce((acc, t) => acc + Math.abs(t.valor), 0);
    
    const totalCalculado = compras + encargos - creditos - estornos;

    // Subtotals per holder for cards
    // Isabela: subtotal líquido = soma(compras...) - soma(créditos)
    const isabelaPurchases = transacoes.filter(t => t.titularId === 'isabela' && ['Loja', 'Fornecedor', 'Serviço Digital', 'Depósito', 'Cliente', 'Encargo Bancário'].includes(t.tipo)).reduce((acc, t) => acc + t.valor, 0);
    const isabelaCredits = transacoes.filter(t => t.titularId === 'isabela' && t.tipo === 'Crédito').reduce((acc, t) => acc + t.valor, 0);
    const isabelaEstornos = transacoes.filter(t => t.titularId === 'isabela' && t.tipo === 'Estorno').reduce((acc, t) => acc + Math.abs(t.valor), 0);
    const isabelaSub = isabelaPurchases - isabelaCredits - isabelaEstornos;

    const claudioSub = transacoes.filter(t => t.titularId === 'claudio' && t.tipo !== 'Pagamento').reduce((acc, t) => acc + t.valor, 0);
    const danielSub = transacoes.filter(t => t.titularId === 'daniel' && t.tipo !== 'Pagamento').reduce((acc, t) => acc + t.valor, 0);

    return {
      compras,
      encargos,
      creditos,
      estornos,
      totalCalculado,
      isabela: isabelaSub,
      claudio: claudioSub,
      daniel: danielSub
    };
  }, [transacoes]);

  const EXPECTED_TOTAL = 11019.68;
  const diff = Math.abs(totals.totalCalculado - EXPECTED_TOTAL);
  const isValid = diff < 0.01;

  const crossTable = useMemo(() => {
    const rowLabels = ["Araraquara", "Online / Digital", "Não identificado", "Encargos"];
    return rowLabels.map(label => {
      const row: any = { label };
      let total = 0;
      config.titulares.forEach(titular => {
        let val = 0;
        if (label === 'Encargos') {
          val = transacoes
            .filter(t => t.titularId === titular.id && t.tipo === 'Encargo Bancário')
            .reduce((acc, t) => acc + t.valor, 0);
        } else {
          val = transacoes
            .filter(t => t.unidade === label && t.titularId === titular.id && ['Loja', 'Fornecedor', 'Serviço Digital', 'Depósito', 'Cliente'].includes(t.tipo))
            .reduce((acc, t) => acc + t.valor, 0);
        }
        row[titular.id] = val;
        total += val;
      });
      row.total = total;
      return row;
    });
  }, [transacoes, config]);

  const filteredTransacoes = useMemo(() => {
    return transacoes.filter(t => {
      if (filterTitular !== "Todos" && t.titularId !== filterTitular) return false;
      if (showOnlyUnidentified && t.unidade !== "Não identificado") return false;
      if (!showPayments && (t.tipo === "Pagamento" || t.tipo === "Crédito")) return false;
      return true;
    });
  }, [transacoes, filterTitular, showOnlyUnidentified, showPayments]);

  const getTitularColor = (id: string) => {
    if (id === "isabela") return "bg-amber-500 text-white";
    if (id === "claudio") return "bg-blue-500 text-white";
    if (id === "daniel") return "bg-teal-500 text-white";
    return "bg-slate-500 text-white";
  };

  const getTitularInitials = (id: string) => {
    if (id === "isabela") return "IS";
    if (id === "claudio") return "CD";
    if (id === "daniel") return "DV";
    return "??";
  };

  const getRowColor = (t: Transacao) => {
    if (t.tipo === "Encargo Bancário") return "bg-red-50 text-red-700";
    if (t.unidade === "Não identificado") return "bg-amber-50 text-amber-700";
    if (t.tipo === "Crédito") return "bg-blue-50 text-blue-700";
    if (t.tipo === "Estorno") return "text-green-600";
    return "";
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden text-slate-900">
      {/* HEADER */}
      <header className="px-6 py-4 flex justify-between items-center bg-white border-b shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Classificador de Fatura C6 Bank</h1>
          <Badge className={cn("text-[10px] font-bold uppercase", isValid ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")}>
            Total calculado: {formatBRL(totals.totalCalculado)} — Esperado: {formatBRL(EXPECTED_TOTAL)} [{isValid ? '✓ Correto' : '✗ Divergência'}]
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => exportToXLSX(transacoes, config)} className="flex gap-2">
            <Download className="w-4 h-4" /> Exportar Excel
          </Button>
        </div>
      </header>

      {/* METRIC CARDS */}
      <div className="px-6 py-4 grid grid-cols-4 gap-4 shrink-0">
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-6">
        {/* LEFT COLUMN: Cross Table */}
        <div className="w-[55%] flex flex-col gap-6 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="py-3 px-4 shrink-0 border-b bg-slate-50/50">
              <CardTitle className="text-sm font-bold uppercase text-slate-500">Distribuição Cidade × Titular</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="font-bold">Cidade</TableHead>
                    <TableHead className="text-right font-bold">Isabela</TableHead>
                    <TableHead className="text-right font-bold">Claudio</TableHead>
                    <TableHead className="text-right font-bold">Daniel</TableHead>
                    <TableHead className="text-right font-bold bg-slate-50">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossTable.map((row, idx) => (
                    <TableRow key={idx} className={cn(row.label === 'Não identificado' && row.total > 0 ? 'bg-amber-50' : row.label === 'Encargos' ? 'bg-red-50' : '')}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.isabela > 0 ? formatBRL(row.isabela) : '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.claudio > 0 ? formatBRL(row.claudio) : '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.daniel > 0 ? formatBRL(row.daniel) : '-'}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums bg-slate-50">{formatBRL(row.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-100 font-black text-[11px]">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(crossTable.reduce((acc, r) => acc + r.isabela, 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(crossTable.reduce((acc, r) => acc + r.claudio, 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(crossTable.reduce((acc, r) => acc + r.daniel, 0))}</TableCell>
                    <TableCell className="text-right tabular-nums bg-slate-200">{formatBRL(crossTable.reduce((acc, r) => acc + r.total, 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
          
          {/* Summary Distribution Bar */}
          <Card className="shrink-0">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Distribuição por Titular</span>
                <div className="flex gap-4">
                  {config.titulares.map(t => (
                    <div key={t.id} className="flex items-center gap-1">
                      <div className={cn("w-2 h-2 rounded-full", getTitularColor(t.id))} />
                      <span className="text-[10px] font-bold text-slate-600">{t.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100">
                {config.titulares.map(t => {
                  const total = totals[t.id as keyof typeof totals] as number;
                  const percentage = (total / (totals.compras + totals.encargos)) * 100;
                  return (
                    <div 
                      key={t.id} 
                      className={cn("h-full transition-all", getTitularColor(t.id))} 
                      style={{ width: `${percentage}%` }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2">
                 {config.titulares.map(t => {
                    const total = totals[t.id as keyof typeof totals] as number;
                    return (
                      <div key={t.id} className="text-center">
                        <p className="text-[10px] font-bold text-slate-900">{formatBRL(total)}</p>
                      </div>
                    );
                 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Transactions Table */}
        <div className="w-[45%] flex flex-col gap-4 overflow-hidden">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="py-3 px-4 shrink-0 border-b bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Select value={filterTitular} onValueChange={setFilterTitular}>
                  <SelectTrigger className="h-8 w-[120px] bg-white">
                    <Filter className="w-3 h-3 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {config.titulares.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border h-8">
                  <Switch id="unidentified" checked={showOnlyUnidentified} onCheckedChange={setShowOnlyUnidentified} className="scale-75" />
                  <Label htmlFor="unidentified" className="text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1">
                    Pendentes
                  </Label>
                </div>

                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border h-8">
                  <Switch id="payments" checked={showPayments} onCheckedChange={setShowPayments} className="scale-75" />
                  <Label htmlFor="payments" className="text-[10px] font-bold uppercase cursor-pointer">
                    Pgtos
                  </Label>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredTransacoes.length} linhas</span>
            </CardHeader>
            
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow className="text-[10px] uppercase text-slate-500">
                    <TableHead className="w-[50px]">Tit</TableHead>
                    <TableHead className="w-[60px]">Data</TableHead>
                    <TableHead>Estabelecimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransacoes.map(t => (
                    <TableRow key={t.id} className={cn("group text-xs", getRowColor(t))}>
                      <TableCell className="py-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-[8px]", getTitularColor(t.titularId))}>
                                {getTitularInitials(t.titularId)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-bold">{config.titulares.find(tit => tit.id === t.titularId)?.nome}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="py-2 font-medium text-slate-500">{t.data}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <Input 
                            value={t.nomeLimpo} 
                            onChange={(e) => updateTransacao(t.id, { nomeLimpo: e.target.value })}
                            className="h-6 text-[11px] border-none shadow-none bg-transparent hover:bg-white focus:bg-white p-0 px-1 font-bold"
                          />
                          <div className="flex gap-2 items-center">
                             <Select value={t.unidade} onValueChange={(v) => updateTransacao(t.id, { unidade: v as Cidade })}>
                              <SelectTrigger className="h-4 text-[9px] bg-transparent border-none p-0 w-auto gap-1 text-slate-400 font-medium shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["Araraquara", "Online / Digital", "Não identificado"].map(c => (
                                  <SelectItem key={c} value={c} className="text-[10px]">{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-[9px] text-slate-300">•</span>
                            <Select value={t.tipo} onValueChange={(v) => updateTransacao(t.id, { tipo: v as TipoDestino })}>
                              <SelectTrigger className="h-4 text-[9px] bg-transparent border-none p-0 w-auto gap-1 text-slate-400 font-medium shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["Loja", "Depósito", "Cliente", "Fornecedor", "Serviço Digital", "Encargo Bancário", "Estorno", "Crédito", "Pagamento"].map(type => (
                                  <SelectItem key={type} value={type} className="text-[10px]">{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {t.parcela && t.parcela !== "—" && (
                              <>
                                <span className="text-[9px] text-slate-300">•</span>
                                <span className="text-[9px] text-slate-400 italic">{t.parcela}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={cn("py-2 text-right font-bold tabular-nums", t.tipo === "Estorno" ? "text-green-600" : "")}>
                        {formatBRL(t.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
