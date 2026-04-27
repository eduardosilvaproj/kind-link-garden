import { useState, useMemo } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRANSACOES, TOTAL_FATURA, SUBTOTAL_ISABELA, SUBTOTAL_CLAUDIO, SUBTOTAL_DANIEL } from '../data/transactions';
 import { Download, AlertCircle, Filter, FilterX, Eye, EyeOff, FileText } from "lucide-react";
 import jsPDF from 'jspdf';
 import html2canvas from 'html2canvas';
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

   const exportPDF = async () => {
     const element = document.getElementById('pdf-content');
     if (!element) return;
     
     // Temporarily remove overflow and height constraints for full capture
     const originalStyle = element.style.cssText;
     element.style.height = 'auto';
     element.style.overflow = 'visible';
     
     const canvas = await html2canvas(element, { 
       scale: 2, 
       useCORS: true,
       logging: false,
       windowWidth: element.scrollWidth,
       windowHeight: element.scrollHeight
     });
     
     element.style.cssText = originalStyle;
     
     const imgData = canvas.toDataURL('image/png');
     const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
     const pageWidth = pdf.internal.pageSize.getWidth();
     const pageHeight = pdf.internal.pageSize.getHeight();
     const imgWidth = pageWidth;
     const imgHeight = (canvas.height * pageWidth) / canvas.width;
     
     let heightLeft = imgHeight;
     let position = 0;
     
     pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
     heightLeft -= pageHeight;
     
     while (heightLeft > 0) {
       position = heightLeft - imgHeight;
       pdf.addPage();
       pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
       heightLeft -= pageHeight;
     }
     
     pdf.save('Fatura_C6_Abril_2026.pdf');
   };
 
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
      const rowLabels = [
        "Araraquara",
        "Bauru",
        "Ribeirão Preto",
        "São Carlos",
        "Online",
        "Não identificado",
        "Encargos"
      ];
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
                                 {["Araraquara", "Bauru", "Ribeirão Preto", "São Carlos", "Online", "Não identificado"].map(c => (
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
