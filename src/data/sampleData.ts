import { Transacao } from '../types';

 export const SAMPLE_TRANSACTIONS: Transacao[] = [
   { id: "1", data: "24 abr", estabelecimento: "MERCADOLIVRE*INTERFY", nomeLimpo: "MercadoLivre - Interfy", parcela: "12/12", valor: 163.38, titularId: "isabela", unidade: "Online / Digital", tipo: "Loja", observacao: "", isEstorno: false, isEncargo: false },
   { id: "2", data: "21 jan", estabelecimento: "ASAAS *PRO MOVEL", nomeLimpo: "Asaas - Pro Móvel", parcela: "3/4", valor: 507.40, titularId: "isabela", unidade: "Online / Digital", tipo: "Serviço Digital", observacao: "", isEstorno: false, isEncargo: false },
   // ... (simplified for brevity, you should add all 118 items here)
 ];