import { Transacao } from '../types';

export const SAMPLE_TRANSACTIONS: Transacao[] = [
  {
    id: "1",
    data: "19 mar",
    estabelecimento: "TAUSTE SUPERMERCADOS L",
    nomeLimpo: "Tauste",
    parcela: "",
    valor: 297.89,
    titularId: "isabela",
    unidade: "Araraquara",
    tipo: "Loja",
    observacao: "Compras do mês",
    isEstorno: false,
    isEncargo: false
  },
  {
    id: "2",
    data: "20 mar",
    estabelecimento: "AMAZON*MARKETPLACE",
    nomeLimpo: "Amazon",
    parcela: "1/3",
    valor: 150.00,
    titularId: "claudio",
    unidade: "Online / Digital",
    tipo: "Loja",
    observacao: "",
    isEstorno: false,
    isEncargo: false
  },
  {
    id: "3",
    data: "21 mar",
    estabelecimento: "IOF Rotativo",
    nomeLimpo: "IOF",
    parcela: "",
    valor: 12.45,
    titularId: "daniel",
    unidade: "Não identificado",
    tipo: "Encargo Bancário",
    observacao: "",
    isEstorno: false,
    isEncargo: true
  },
  {
    id: "4",
    data: "22 mar",
    estabelecimento: "Estorno de Compra",
    nomeLimpo: "Estorno",
    parcela: "",
    valor: 50.00,
    titularId: "isabela",
    unidade: "Araraquara",
    tipo: "Loja",
    observacao: "",
    isEstorno: true,
    isEncargo: false
  }
  // ... more would be added in a real app, but this serves for demo
];

for (let i = 5; i <= 20; i++) {
  SAMPLE_TRANSACTIONS.push({
    id: String(i),
    data: `${Math.floor(Math.random() * 28) + 1} abr`,
    estabelecimento: i % 3 === 0 ? "MERCADO LIVRE" : "POSTO IPIRANGA",
    nomeLimpo: i % 3 === 0 ? "Mercado Livre" : "Posto",
    parcela: "",
    valor: Math.random() * 200,
    titularId: ["isabela", "claudio", "daniel"][i % 3],
    unidade: i % 3 === 0 ? "Online / Digital" : "Araraquara",
    tipo: "Loja",
    observacao: "",
    isEstorno: false,
    isEncargo: false
  });
}