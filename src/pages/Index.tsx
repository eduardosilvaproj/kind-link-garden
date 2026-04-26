// Update this page (the content is just a fallback if you fail to update the page)

// IMPORTANT: Fully REPLACE this with your own code
import { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SAMPLE_TRANSACTIONS } from '../data/sampleData';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Download, Upload, BarChart3, List, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { parseC6PDF } from "../lib/pdfParser";
import { Cidade, TipoDestino, Transacao } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const Index = () => {
  const { transacoes, setTransacoes, config, updateTransacao, updateConfig, clearData } = useAppContext();
  const [filterTitular, setFilterTitular] = useState<string>("Todos");
  const [filterCidade, setFilterCidade] = useState<string>("Todas");
  const [filterUnclassified, setFilterUnclassified] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const newTransacoes = await parseC6PDF(file, config);
    setTransacoes([...transacoes, ...newTransacoes]);
  };

  const loadDemo = () => setTransacoes(SAMPLE_TRANSACTIONS);

  const filteredTransacoes = transacoes.filter(t => {
    if (filterTitular !== "Todos" && t.titularId !== filterTitular) return false;
    if (filterCidade !== "Todas" && t.unidade !== filterCidade) return false;
    if (filterUnclassified && t.unidade !== "Não identificado") return false;
    return true;
  });

  const getTitularColor = (id: string) => {
    const t = config.titulares.find(tit => tit.id === id);
    if (t?.cor === "amber") return "bg-amber-100 text-amber-800 border-amber-200";
    if (t?.cor === "blue") return "bg-blue-100 text-blue-800 border-blue-200";
    if (t?.cor === "teal") return "bg-teal-100 text-teal-800 border-teal-200";
    return "bg-gray-100";
  };

  const totalsByCity = Array.from(new Set(transacoes.map(t => t.unidade))).map(cidade => {
    const total = transacoes.filter(t => t.unidade === cidade).reduce((acc, t) => acc + t.valor, 0);
    return { name: cidade, value: total };
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Classificador de Fatura C6</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearData}>Limpar tudo</Button>
          <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        <Tabs defaultValue="classificacao" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="upload" className="flex gap-2"><Upload className="w-4 h-4" /> Upload</TabsTrigger>
            <TabsTrigger value="classificacao" className="flex gap-2"><List className="w-4 h-4" /> Classificar</TabsTrigger>
            <TabsTrigger value="resumo" className="flex gap-2"><BarChart3 className="w-4 h-4" /> Resumo</TabsTrigger>
            <TabsTrigger value="exportar" className="flex gap-2"><Download className="w-4 h-4" /> Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Importar extrato PDF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                  <input type="file" accept="application/pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Arraste seu PDF aqui ou clique para selecionar</p>
                  <p className="text-slate-400 text-sm mt-1">Extratos do C6 Bank em formato PDF</p>
                </div>
                
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="h-px w-20 bg-slate-200"></div>
                    <span className="text-xs uppercase font-bold tracking-widest">ou use dados simulados</span>
                    <div className="h-px w-20 bg-slate-200"></div>
                  </div>
                  <Button variant="secondary" onClick={loadDemo}>Carregar dados de exemplo</Button>
                </div>

                {transacoes.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                    <Card className="bg-primary/5 border-primary/10">
                      <CardContent className="p-4">
                        <p className="text-xs text-primary/60 font-bold uppercase">Transações</p>
                        <p className="text-2xl font-bold">{transacoes.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
                        <p className="text-2xl font-bold">R$ {transacoes.reduce((acc, t) => acc + t.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-amber-600 font-bold uppercase">Pendentes</p>
                        <p className="text-2xl font-bold text-amber-600">{transacoes.filter(t => t.unidade === "Não identificado").length}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classificacao">
            <div className="flex flex-col gap-4">
              <Card className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Titular</label>
                    <Select value={filterTitular} onValueChange={setFilterTitular}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Titular" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todos">Todos</SelectItem>
                        {config.titulares.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                    <Select value={filterCidade} onValueChange={setFilterCidade}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Cidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todas">Todas</SelectItem>
                        {["Araraquara", "Bauru", "São Carlos", "Ribeirão Preto", "Online / Digital", "Outra cidade", "Não identificado"].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox id="unclassified" checked={filterUnclassified} onCheckedChange={(v) => setFilterUnclassified(!!v)} />
                    <label htmlFor="unclassified" className="text-sm font-medium leading-none cursor-pointer">Apenas não classificados</label>
                  </div>
                </div>
              </Card>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-20">Titular</TableHead>
                      <TableHead className="w-20">Data</TableHead>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead>Nome Limpo</TableHead>
                      <TableHead className="w-40">Unidade</TableHead>
                      <TableHead className="w-40">Tipo</TableHead>
                      <TableHead className="w-20">Parc.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransacoes.map(t => (
                      <TableRow key={t.id} className={cn(
                        t.isEncargo ? "bg-red-50/50" : t.unidade === "Não identificado" ? "bg-amber-50/30" : ""
                      )}>
                        <TableCell>
                          <Badge variant="outline" className={getTitularColor(t.titularId)}>
                            {config.titulares.find(tit => tit.id === t.titularId)?.nome.substring(0, 2).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">{t.data}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs font-mono" title={t.estabelecimento}>{t.estabelecimento}</TableCell>
                        <TableCell>
                          <Input 
                            value={t.nomeLimpo} 
                            onChange={(e) => updateTransacao(t.id, { nomeLimpo: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={t.unidade} onValueChange={(v) => updateTransacao(t.id, { unidade: v as Cidade })}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Araraquara", "Bauru", "São Carlos", "Ribeirão Preto", "Online / Digital", "Outra cidade", "Não identificado"].map(c => (
                                <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={t.tipo} onValueChange={(v) => updateTransacao(t.id, { tipo: v as TipoDestino })}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["Loja", "Depósito", "Cliente", "Fornecedor", "Serviço Digital", "Encargo Bancário"].map(type => (
                                <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">{t.parcela}</TableCell>
                        <TableCell className={cn("text-right font-semibold tabular-nums", t.isEstorno ? "text-green-600" : "text-slate-900")}>
                          {t.isEstorno ? "-" : ""}R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resumo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gastos por Cidade</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={totalsByCity} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                      <RechartsTooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6">
                {config.titulares.map(titular => {
                  const total = transacoes.filter(t => t.titularId === titular.id).reduce((acc, t) => acc + t.valor, 0);
                  const encargos = transacoes.filter(t => t.titularId === titular.id && t.isEncargo).reduce((acc, t) => acc + t.valor, 0);
                  return (
                    <Card key={titular.id}>
                      <CardContent className="p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg", getTitularColor(titular.id))}>
                            {titular.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{titular.nome}</p>
                            <p className="text-xs text-slate-500 uppercase">{titular.tipo} • Final {titular.final}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          {encargos > 0 && <p className="text-xs text-red-500 font-bold">Encargos: R$ {encargos.toFixed(2)}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="exportar">
             <Card>
                <CardHeader>
                  <CardTitle>Exportar Dados</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button className="flex gap-2"><Download className="w-4 h-4" /> Exportar XLSX</Button>
                  <Button variant="outline" className="flex gap-2"><Download className="w-4 h-4" /> Exportar CSV</Button>
                  <Button variant="outline" className="flex gap-2"><FileText className="w-4 h-4" /> Relatório PDF</Button>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
