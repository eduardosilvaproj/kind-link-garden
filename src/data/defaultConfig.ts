import { Config } from "../types";

export const DEFAULT_CONFIG: Config = {
  titulares: [
    { id: "Isabela", nome: "Isabela", tipo: "Principal", final: "1691", cor: "amber" },
    { id: "Claudio", nome: "Claudio", tipo: "Virtual", final: "8252", cor: "blue" },
    { id: "Daniel", nome: "Daniel", tipo: "Adicional", final: "6353", cor: "teal" },
  ],
  rules: [
    { keyword: "TAUSTE", cidade: "Araraquara", tipo: "Loja" },
    { keyword: "ASSAI", cidade: "Araraquara", tipo: "Loja" },
    { keyword: "CAFE UTAM", cidade: "Araraquara", tipo: "Loja" },
    { keyword: "CASA DELIZA", cidade: "Araraquara", tipo: "Loja" },
    { keyword: "SUPERMERCADOS JAU", cidade: "Araraquara", tipo: "Loja" },
    { keyword: "PIPOCOPOS", cidade: "Araraquara", tipo: "Loja" },
    { keyword: "PAPELARIA", cidade: "Araraquara", tipo: "Loja" },
    { keyword: "MERCADOLIVRE", cidade: "Online / Digital", tipo: "Loja" },
    { keyword: "MERCADO*", cidade: "Online / Digital", tipo: "Loja" },
    { keyword: "AMAZON*", cidade: "Online / Digital", tipo: "Loja" },
    { keyword: "CANVA", cidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "AMAZON MUSIC", cidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "AMAZONPRIMEBR", cidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "VINDI", cidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "CLUBE LIVELO", cidade: "Online / Digital", tipo: "Serviço Digital" },
    { keyword: "DONNA COMERCIO", cidade: "Araraquara", tipo: "Depósito" },
    { keyword: "VAROTTI", cidade: "Araraquara", tipo: "Fornecedor" },
    { keyword: "Multa Contratual", cidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "Juros de Mora", cidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "IOF Rotativo", cidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "Encargos", cidade: "Não identificado", tipo: "Encargo Bancário" },
  ]
};