import * as XLSX from 'xlsx';
import { Transacao, Config } from '../types';

export const exportToXLSX = (transacoes: Transacao[], config: Config) => {
  const wb = XLSX.utils.book_new();
  
   // Sheet 1: Transações
   const dataTransacoes = transacoes.map(t => {
     const titular = config.titulares.find(tit => tit.id === t.titular);
     return {
       'Titular': titular?.nome || t.titular,
       'Data': t.data,
       'Estabelecimento (Raw)': t.raw,
       'Nome Limpo': t.nome,
       'Cidade/Unidade': t.cidade,
       'Tipo': t.tipo,
       'Destino': t.destino === "Cliente" && t.clienteNome ? `Cliente — ${t.clienteNome}` : (t.destino || ""),
       'Parcela': t.parcela,
       'Valor': t.valor
     };
   });
  const wsTransacoes = XLSX.utils.json_to_sheet(dataTransacoes);
  XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Transações');
  
   // Sheet 2: Resumo
   const activeCities = Array.from(new Set(transacoes.map(t => t.cidade)));
   const cityRows = [
     "Araraquara", 
     "Bauru", 
     "Ribeirão Preto", 
     "São Carlos", 
     "Online / Digital", 
     "Não identificado"
   ].filter(label => activeCities.includes(label) || label === "Não identificado");
   
    const summaryRows = [...cityRows, "Encargos", "Total"];
    const titulares = config.titulares;
    const resumoData = summaryRows.map(label => {
      const row: any = { 'Cidade': label };
      let totalRow = 0;
      titulares.forEach(titular => {
        let val = 0;
        if (label === "Total") {
          val = transacoes.reduce((acc, t) => {
            if (t.titular !== titular.id) return acc;
            const isNegative = t.tipo === 'Crédito' || t.tipo === 'Estorno' || t.tipo === 'Pagamento';
            const finalVal = isNegative ? -Math.abs(t.valor) : t.valor;
            return acc + finalVal;
          }, 0);
        } else if (label === "Encargos") {
          val = transacoes.reduce((acc, t) => {
            if (t.tipo === 'Encargo Bancário' && t.titular === titular.id) {
              return acc + t.valor;
            }
            return acc;
          }, 0);
        } else {
          val = transacoes.reduce((acc, t) => {
            if (t.cidade === label && t.titular === titular.id && !['Crédito', 'Estorno', 'Pagamento', 'Encargo Bancário'].includes(t.tipo)) {
              return acc + t.valor;
            }
            return acc;
          }, 0);
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
  const headers = ['Titular', 'Data', 'Estabelecimento', 'Nome Limpo', 'Cidade', 'Tipo', 'Parcela', 'Valor'];
  const rows = transacoes.map(t => [
    t.titular, t.data, t.raw, t.nome, t.cidade, t.tipo, t.parcela, t.valor
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
