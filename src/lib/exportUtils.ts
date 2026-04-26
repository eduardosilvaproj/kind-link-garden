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
  const cidades = ["Araraquara", "Bauru", "São Carlos", "Ribeirão Preto", "Online / Digital", "Outra cidade", "Não identificado"];
  const titulares = config.titulares;
  
  const summaryRows = ["Araraquara", "Online / Digital", "Não identificado", "Encargos", "Total"];
  const resumoData = summaryRows.map(cidade => {
    if (cidade === "Total") {
      const row: any = { 'Cidade': 'Total' };
      let totalGeral = 0;
      titulares.forEach(titular => {
        let val = 0;
        // We want the same logic as the crossTable in UI: Purchases + Encargos
        const purc = transacoes.filter(t => t.titularId === titular.id && ['Loja', 'Fornecedor', 'Serviço Digital', 'Depósito', 'Cliente'].includes(t.tipo)).reduce((acc, t) => acc + t.valor, 0);
        const enc = transacoes.filter(t => t.titularId === titular.id && t.tipo === 'Encargo Bancário').reduce((acc, t) => acc + t.valor, 0);
        val = purc + enc;
        row[titular.nome] = val;
        totalGeral += val;
      });
      row['Total'] = totalGeral;
      return row;
    }
    const row: any = { 'Cidade': cidade };
    let totalCidade = 0;
    titulares.forEach(titular => {
      let valor = 0;
      if (cidade === 'Encargos') {
        valor = transacoes.filter(t => t.titularId === titular.id && t.tipo === 'Encargo Bancário').reduce((acc, t) => acc + t.valor, 0);
      } else {
        valor = transacoes.filter(t => t.unidade === cidade && t.titularId === titular.id && ['Loja', 'Fornecedor', 'Serviço Digital', 'Depósito', 'Cliente'].includes(t.tipo)).reduce((acc, t) => acc + t.valor, 0);
      }
      row[titular.nome] = valor;
      totalCidade += valor;
    });
    row['Total'] = totalCidade;
    return row;
  });
  
  // Adicionar linha de total final
  const totalGeral: any = { 'Cidade': 'TOTAL GERAL' };
  titulares.forEach(titular => {
    totalGeral[titular.nome] = transacoes
      .filter(t => t.titularId === titular.id && t.tipo !== 'Pagamento')
      .reduce((acc, t) => acc + t.valor, 0);
  });
  totalGeral['Total'] = transacoes
    .filter(t => t.tipo !== 'Pagamento')
    .reduce((acc, t) => acc + t.valor, 0);
  resumoData.push(totalGeral);

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
