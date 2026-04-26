import { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRANSACOES, TOTAL_FATURA, SUBTOTAL_ISABELA, SUBTOTAL_CLAUDIO, SUBTOTAL_DANIEL } from '../data/transactions';
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
  // Simplified initialization
   useState(() => {
     if (transacoes.length === 0) {
       setTransacoes(TRANSACOES);
     } else {
       // If we have saved data, check if it has the new fields
       // This handles the first load after the update
       const hasRealData = transacoes.length === TRANSACOES.length;
       if (!hasRealData) {
         setTransacoes(TRANSACOES);
       }
     }
   });

   const totals = useMemo(() => {
     const compras = transacoes.filter(t => !['Crédito', 'Estorno', 'Pagamento', 'Encargo Bancário'].includes(t.tipo)).reduce((acc, t) => acc + t.valor, 0);
     const encargos = transacoes.filter(t => t.tipo === 'Encargo Bancário').reduce((acc, t) => acc + t.valor, 0);
     const creditos = transacoes.filter(t => t.tipo === 'Crédito').reduce((acc, t) => acc + t.valor, 0);
     const estornos = transacoes.filter(t => t.tipo === 'Estorno').reduce((acc, t) => acc + Math.abs(t.valor), 0);
     
     // Isabela: R$ 28.058,69 - Crédito 1 (4.458,05) - Crédito 2 (18.221,35) + Estorno 1 (187,90) + Estorno 2 (98,00) = R$ 5.665,19?
     // The user says "Isabela card shows: R$ 28.058,69". That is the raw subtotal without subtracting credits.
     const isabelaTotal = transacoes.filter(t => t.titular === 'Isabela' && t.tipo !== 'Crédito').reduce((acc, t) => acc + t.valor, 0);
     const claudioTotal = transacoes.filter(t => t.titular === 'Claudio' && t.tipo !== 'Crédito').reduce((acc, t) => acc + t.valor, 0);
     const danielTotal = transacoes.filter(t => t.titular === 'Daniel' && t.tipo !== 'Crédito').reduce((acc, t) => acc + t.valor, 0);
 
     return {
       compras,
       encargos,
       creditos,
       estornos,
       totalCalculado: TOTAL_FATURA,
       isabela: isabelaTotal,
       claudio: claudioTotal,
       daniel: danielTotal
     };
   }, [transacoes]);

  const EXPECTED_TOTAL = 11019.68;
  const diff = Math.abs(totals.totalCalculado - EXPECTED_TOTAL);
  const isValid = diff < 0.01;

    const crossTable = useMemo(() => {
      const rowLabels = ["Araraquara", "Online", "Não identificado", "Encargos"];
      const titularIds = ["Isabela", "Claudio", "Daniel"];
      
      return rowLabels.map(label => {
        const row: any = { label };
        let total = 0;
        titularIds.forEach(titularId => {
          let val = 0;
          if (label === 'Encargos') {
            val = transacoes
              .filter(t => t.titular === titularId && t.tipo === 'Encargo Bancário')
              .reduce((acc, t) => acc + t.valor, 0);
          } else {
            val = transacoes
              .filter(t => 
                t.titular === titularId &&
                (label === "Online" ? (t.cidade === "Online" || t.cidade === "Online / Digital") : t.cidade === label) &&
                t.tipo !== "Crédito" &&
                t.tipo !== "Estorno" &&
                t.tipo !== "Pagamento" &&
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
    }, [transacoes]);

  const filteredTransacoes = useMemo(() => {
    return transacoes.filter(t => {
      if (filterTitular !== "Todos" && t.titular !== filterTitular) return false;
      if (showOnlyUnidentified && t.cidade !== "Não identificado") return false;
      if (!showPayments && (t.tipo === "Pagamento" || t.tipo === "Crédito")) return false;
      return true;
    });
  }, [transacoes, filterTitular, showOnlyUnidentified, showPayments]);

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
    if (lower === "claudio") return "CD";
    if (lower === "daniel") return "DV";
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

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden text-slate-900">
      {/* HEADER */}
      <header className="px-6 py-4 flex justify-between items-center bg-white border-b shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Classificador de Fatura C6 Bank</h1>
          <Badge className={cn("text-[10px] font-bold uppercase px-3 py-1", isValid ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200")}>
            Total calculado: {formatBRL(totals.totalCalculado)} {isValid ? '✓' : '✗'}
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
               <Table className="table-fixed w-full">
                 <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-bold w-[130px] text-[11px] uppercase py-1 h-8">Cidade</TableHead>
                      <TableHead className="text-right font-bold w-[22%] text-[11px] uppercase py-1 h-8">Isabela</TableHead>
                      <TableHead className="text-right font-bold w-[22%] text-[11px] uppercase py-1 h-8">Claudio</TableHead>
                      <TableHead className="text-right font-bold w-[22%] text-[11px] uppercase py-1 h-8">Daniel</TableHead>
                      <TableHead className="text-right font-bold bg-slate-100/50 w-[22%] text-[11px] uppercase py-1 h-8">Total</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                   {crossTable.map((row, idx) => (
                     <TableRow key={idx} className={cn(row.label === 'Não identificado' && row.total > 0 ? 'bg-amber-50' : row.label === 'Encargos' ? 'bg-red-50' : '')}>
                        <TableCell className="font-medium text-[11px] whitespace-normal leading-tight py-2">{row.label}</TableCell>
                        <TableCell className="text-right tabular-nums text-[12px]">{row.Isabela > 0.01 ? formatBRL(row.Isabela).replace("R$", "").trim() : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-[12px]">{row.Claudio > 0.01 ? formatBRL(row.Claudio).replace("R$", "").trim() : '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-[12px]">{row.Daniel > 0.01 ? formatBRL(row.Daniel).replace("R$", "").trim() : '—'}</TableCell>
                        <TableCell className="text-right font-bold tabular-nums bg-slate-50 text-[12px]">{formatBRL(row.total).replace("R$", "").trim()}</TableCell>
                     </TableRow>
                   ))}
                   <TableRow className="bg-slate-100 font-black text-[11px]">
                      <TableCell className="w-[130px] text-[12px]">Total</TableCell>
                      <TableCell className="text-right tabular-nums w-[22%] text-[12px] font-bold">{formatBRL(crossTable.reduce((acc, r) => acc + r.Isabela, 0)).replace("R$", "").trim()}</TableCell>
                      <TableCell className="text-right tabular-nums w-[22%] text-[12px] font-bold">{formatBRL(crossTable.reduce((acc, r) => acc + r.Claudio, 0)).replace("R$", "").trim()}</TableCell>
                      <TableCell className="text-right tabular-nums w-[22%] text-[12px] font-bold">{formatBRL(crossTable.reduce((acc, r) => acc + r.Daniel, 0)).replace("R$", "").trim()}</TableCell>
                      <TableCell className="text-right tabular-nums bg-slate-200 w-[22%] text-[12px] font-bold">{formatBRL(crossTable.reduce((acc, r) => acc + r.total, 0)).replace("R$", "").trim()}</TableCell>
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
                              <div className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-[8px]", getTitularColor(t.titular))}>
                                {getTitularInitials(t.titular)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                             <p className="text-xs font-bold">{config.titulares.find(tit => tit.id === t.titular)?.nome}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="py-2 font-medium text-slate-500">{t.data}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <Input 
                            value={t.nome} 
                            onChange={(e) => updateTransacao(t.id, { nome: e.target.value })}
                            className="h-6 text-[11px] border-none shadow-none bg-transparent hover:bg-white focus:bg-white p-0 px-1 font-bold"
                          />
                           <div className="flex gap-1 items-center mt-1">
                             <Select value={t.cidade} onValueChange={(v) => updateTransacao(t.id, { cidade: v })}>
                               <SelectTrigger className="h-5 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600 font-medium shadow-none hover:bg-slate-50">
                                 <SelectValue placeholder="Cidade" />
                               </SelectTrigger>
                               <SelectContent>
                                 {["Araraquara", "Online", "Não identificado", "—"].map(c => (
                                   <SelectItem key={c} value={c} className="text-[11px]">{c}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>

                             <Select value={t.destino || ""} onValueChange={(v) => updateTransacao(t.id, { destino: v })}>
                               <SelectTrigger className="h-5 text-[11px] bg-white border border-slate-200 rounded-md px-2 w-fit gap-1 text-slate-600 font-medium shadow-none hover:bg-slate-50">
                                 <div className="flex items-center gap-1">
                                   <span>{t.destino === "Cliente" && t.clienteNome ? `Cliente — ${t.clienteNome}` : (t.destino || "Destino")}</span>
                                 </div>
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
                                 onChange={(e) => updateTransacao(t.id, { clienteNome: e.target.value })}
                                 className="h-5 w-24 text-[11px] px-1 border-slate-200"
                               />
                             )}

                             {t.parcela && t.parcela !== "—" && (
                               <Badge variant="outline" className="h-5 text-[11px] font-medium border-slate-200 text-slate-500 rounded-md px-2 py-0">
                                 {t.parcela}
                               </Badge>
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
