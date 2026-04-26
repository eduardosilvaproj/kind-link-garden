import { Config } from "../types";

export const DEFAULT_CONFIG: Config = {
  titulares: [
    { id: "Isabela", nome: "Isabela", tipo: "Principal", final: "1691", cor: "amber" },
    { id: "Claudio", nome: "Claudio", tipo: "Virtual", final: "8252", cor: "blue" },
    { id: "Daniel", nome: "Daniel", tipo: "Adicional", final: "6353", cor: "teal" },
  ],
  rules: [
    { keyword: "TAUSTE", unidade: "Araraquara", tipo: "Loja" },
    { keyword: "ASSAI", unidade: "Araraquara", tipo: "Loja" },
    { keyword: "CAFE UTAM", unidade: "Araraquara", tipo: "Loja" },
    { keyword: "CASA DELIZA", unidade: "Araraquara", tipo: "Loja" },
    { keyword: "SUPERMERCADOS JAU", unidade: "Araraquara", tipo: "Loja" },
    { keyword: "PIPOCOPOS", unidade: "Araraquara", tipo: "Loja" },
    { keyword: "PAPELARIA", unidade: "Araraquara", tipo: "Loja" },
    { keyword: "MERCADOLIVRE", unidade: "Online / Digital", tipo: "Loja" },
    { keyword: "MERCADO*", unidade: "Online / Digital", tipo: "Loja" },
    { keyword: "AMAZON*", unidade: "Online / Digital", tipo: "Loja" },
    { keyword: "CANVA", unidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "AMAZON MUSIC", unidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "AMAZONPRIMEBR", unidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "VINDI", unidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "CLUBE LIVELO", unidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "DONNA COMERCIO", unidade: "Araraquara", tipo: "Depósito" },
    { keyword: "VAROTTI", unidade: "Araraquara", tipo: "Fornecedor" },
    { keyword: "Multa Contratual", unidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "Juros de Mora", unidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "IOF Rotativo", unidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "Encargos", unidade: "Não identificado", tipo: "Encargo Bancário" },
  ]
};