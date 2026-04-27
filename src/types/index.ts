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
  | "Online"
  | "Online / Digital"
  | "—"
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
   | "Crédito"
   | "Pagamento";

 export type Transacao = {
   id: number;
    titular: string;
    titulares?: string[];
   cartao: string;
   data: string;
   raw: string;
   nome: string;
   parcela: string;
   valor: number;
   conferido?: boolean;
   cidade: string;
   tipo: TipoDestino;
   destino?: string;
   clienteNome?: string;
 };

export type AutoRule = {
  keyword: string;
  cidade: Cidade;
  tipo: TipoDestino;
};

export type Config = {
  titulares: Titular[];
  rules: AutoRule[];
};