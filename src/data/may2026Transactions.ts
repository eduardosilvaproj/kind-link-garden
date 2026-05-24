import type { Transacao } from '../types';

export const MAY_2026_TRANSACOES: Transacao[] = [
  {
    id: 20001,
    titular: "Isabela",
    cartao: "1691",
    data: "05 mai",
    raw: "AMAZON.COM.BR",
    nome: "Amazon.com.br",
    parcela: "—",
    valor: 89.90,
    cidade: "Não identificado",
    tipo: "Loja"
  },
  {
    id: 20002,
    titular: "Claudio",
    cartao: "8252",
    data: "10 mai",
    raw: "REGINA PANIFICADORA",
    nome: "Regina Panificadora",
    parcela: "2/10",
    valor: 45.00,
    cidade: "Não identificado",
    tipo: "Loja"
  },
  {
    id: 20003,
    titular: "Isabela",
    cartao: "1691",
    data: "12 mai",
    raw: "ESTORNO COMPRA",
    nome: "Estorno Compra",
    parcela: "—",
    valor: 15.99,
    cidade: "Não identificado",
    tipo: "Estorno"
  },
  {
    id: 20004,
    titular: "Isabela",
    cartao: "1691",
    data: "13 mai",
    raw: "Anuidade Diferenciada",
    nome: "Anuidade C6 Carbon",
    parcela: "2/12",
    valor: 98.00,
    cidade: "—",
    tipo: "Encargo Bancário"
  },
  {
    id: 20005,
    titular: "Isabela",
    cartao: "1691",
    data: "15 mai",
    raw: "MERCADOLIVRE*COMPRA",
    nome: "Mercado Livre",
    parcela: "1/3",
    valor: 250.00,
    cidade: "Não identificado",
    tipo: "Loja"
  },
  {
    id: 20006,
    titular: "Daniel",
    cartao: "6353",
    data: "16 mai",
    raw: "POSTO COMBUSTIVEL",
    nome: "Posto Combustível",
    parcela: "—",
    valor: 150.00,
    cidade: "Não identificado",
    tipo: "Loja"
  }
];
