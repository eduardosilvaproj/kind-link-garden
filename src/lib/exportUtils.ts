import * as XLSX from 'xlsx';
import { Transacao, Config } from '../types';

export const exportToXLSX = (transacoes: Transacao[], config: Config) => {
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Transações
  const dataTransacoes = transacoes.map(t => {
    const titular = config.titulares.find(tit => tit.id === t.titularId);
    return {
      'Titular': titular?.nome || t.titularId,
      'Data': t.data,
      'Estabelecimento (Raw)': t.estabelecimento,
      'Nome Limpo': t.nomeLimpo,
      'Cidade/Unidade': t.unidade,
      'Tipo': t.tipo,
      'Parcela': t.parcela,
      'Valor': t.valor,
      'Obs': t.observacao
    };
  });
  const wsTransacoes = XLSX.utils.json_to_sheet(dataTransacoes);
  XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Transações');
  
  // Sheet 2: Resumo
  const summaryRows = ["Araraquara", "Online / Digital", "Não identificado", "Encargos", "Total"];
  const titulares = config.titulares;
  const resumoData = summaryRows.map(label => {
    const row: any = { 'Cidade': label };
    let totalRow = 0;
    titulares.forEach(titular => {
      let val = 0;
      if (label === "Total") {
        // Logic: Purchases + Encargos - Créditos - Estornos
        const purc = transacoes.filter(t => t.titularId === titular.id && ['Loja', 'Fornecedor', 'Serviço Digital', 'Depósito', 'Cliente'].includes(t.tipo)).reduce((acc, t) => acc + t.valor, 0);
        const enc = transacoes.filter(t => t.titularId === titular.id && t.tipo === 'Encargo Bancário').reduce((acc, t) => acc + t.valor, 0);
        const cred = transacoes.filter(t => t.titularId === titular.id && t.tipo === 'Crédito').reduce((acc, t) => acc + t.valor, 0);
        const est = transacoes.filter(t => t.titularId === titular.id && t.tipo === 'Estorno').reduce((acc, t) => acc + Math.abs(t.valor), 0);
        val = purc + enc - cred - est;
      } else if (label === "Encargos") {
        val = transacoes.filter(t => t.titularId === titular.id && t.tipo === 'Encargo Bancário').reduce((acc, t) => acc + t.valor, 0);
      } else {
        val = transacoes.filter(t => t.unidade === label && t.titularId === titular.id && ['Loja', 'Fornecedor', 'Serviço Digital', 'Depósito', 'Cliente'].includes(t.tipo)).reduce((acc, t) => acc + t.valor, 0);
      }
      row[titular.nome] = val;
      totalRow += val;
    });
    row['Total'] = totalRow;
    return row;
  });

  const wsResumo = XLSX.utils.json_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
  
  XLSX.writeFile(wb, 'Fatura_C6_Classificada.xlsx');
};

export const exportToCSV = (transacoes: Transacao[]) => {
  // Simplificado, focado no XLSX conforme pedido
  const headers = ['Titular', 'Data', 'Estabelecimento', 'Nome Limpo', 'Cidade', 'Tipo', 'Parcela', 'Valor', 'Obs'];
  const rows = transacoes.map(t => [
    t.titularId, t.data, t.estabelecimento, t.nomeLimpo, t.unidade, t.tipo, t.parcela, t.valor, t.observacao
  ]);
  
  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "fatura_c6.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
