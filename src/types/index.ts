export type Titular = {
  id: string;
  nome: string;
  tipo: string;
  final: string;
  cor: string;
};

export type Cidade = 
  | "Araraquara" 
  | "Bauru" 
  | "São Carlos" 
  | "Ribeirão Preto" 
  | "Online / Digital" 
  | "Outra cidade" 
  | "Não identificado";

 export type TipoDestino = 
   | "Loja" 
   | "Depósito" 
   | "Cliente" 
   | "Fornecedor" 
    | "Serviço Digital"
    | "Encargo Bancário"
    | "Estorno"
    | "Crédito/Pagamento"
    | "Loja"
    | "Fornecedor"
    | "Depósito"
    | "Cliente";

export type Transacao = {
  id: string;
  data: string;
  estabelecimento: string;
  nomeLimpo: string;
  parcela: string;
  valor: number;
  titularId: string;
  unidade: Cidade;
  tipo: TipoDestino;
  observacao: string;
  isEstorno: boolean;
  isEncargo: boolean;
};

export type AutoRule = {
  keyword: string;
  unidade: Cidade;
  tipo: TipoDestino;
};

export type Config = {
  titulares: Titular[];
  rules: AutoRule[];
};