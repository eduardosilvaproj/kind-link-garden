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
    { keyword: "MERCADOLIVRE", cidade: "Online", tipo: "Loja" },
    { keyword: "MERCADO*", cidade: "Online", tipo: "Loja" },
    { keyword: "AMAZON*", cidade: "Online", tipo: "Loja" },
    { keyword: "CANVA", cidade: "Online", tipo: "Serviço Digital" },
    { keyword: "AMAZON MUSIC", cidade: "Online", tipo: "Serviço Digital" },
    { keyword: "AMAZONPRIMEBR", cidade: "Online", tipo: "Serviço Digital" },
    { keyword: "VINDI", cidade: "Online", tipo: "Serviço Digital" },
    { keyword: "CLUBE LIVELO", cidade: "Online", tipo: "Serviço Digital" },
    { keyword: "DONNA COMERCIO", cidade: "Araraquara", tipo: "Depósito" },
    { keyword: "VAROTTI", cidade: "Araraquara", tipo: "Fornecedor" },
    { keyword: "Multa Contratual", cidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "Juros de Mora", cidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "IOF Rotativo", cidade: "Não identificado", tipo: "Encargo Bancário" },
    { keyword: "Encargos", cidade: "Não identificado", tipo: "Encargo Bancário" },
  ]
};