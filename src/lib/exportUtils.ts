import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Transacao, Config, Titular } from '../types';

export const exportToXLSX = (transacoes: Transacao[], config: Config) => {
  const data = transacoes.map(t => ({
    Titular: config.titulares.find(tit => tit.id === t.titularId)?.nome || '',
    Data: t.data,
    Estabelecimento: t.estabelecimento,
    'Nome Limpo': t.nomeLimpo,
    Unidade: t.unidade,
    Tipo: t.tipo,
    Parcela: t.parcela,
    Valor: t.valor,
    Observação: t.observacao
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transações");

  // Pivot sheet
  const pivotData: any[] = [];
  const cidades = Array.from(new Set(transacoes.map(t => t.unidade)));
  
  cidades.forEach(cidade => {
    const row: any = { Cidade: cidade };
    config.titulares.forEach(titular => {
      row[titular.nome] = transacoes
        .filter(t => t.unidade === cidade && t.titularId === titular.id)
        .reduce((acc, t) => acc + t.valor, 0);
    });
    pivotData.push(row);
  });

  const wsPivot = XLSX.utils.json_to_sheet(pivotData);
  XLSX.utils.book_append_sheet(wb, wsPivot, "Resumo");

  XLSX.writeFile(wb, "extrato_classificado.xlsx");
};

export const exportToCSV = (transacoes: Transacao[], config: Config) => {
  const headers = ["Titular", "Data", "Estabelecimento", "Nome Limpo", "Unidade", "Tipo", "Parcela", "Valor", "Observacao"];
  const rows = transacoes.map(t => [
    config.titulares.find(tit => tit.id === t.titularId)?.nome || '',
    t.data,
    t.estabelecimento,
    t.nomeLimpo,
    t.unidade,
    t.tipo,
    t.parcela,
    t.valor.toFixed(2),
    t.observacao
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "extrato_classificado.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};