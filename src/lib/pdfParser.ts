import * as pdfjs from 'pdfjs-dist';
import { Transacao, Config, Cidade, TipoDestino } from '../types';

// Worker setup for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const parseC6PDF = async (file: File, config: Config): Promise<Transacao[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument(arrayBuffer).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  // This is a simplified parser logic. 
  // In a real scenario, we'd need to be more robust with regex per line.
  // C6 PDF structure usually groups by "C6 Carbon Final XXXX"
  
  const lines = fullText.split("\n");
  const transactions: Transacao[] = [];
  let currentTitularId = config.titulares[0].id;

  // Pattern: Date | Description | Value
  // Example: "19 mar TAUSTE SUPERMERCADOS L 297,89"
  // Example: "19 mar TAUSTE Parcela 2/5 297,89"
  
  lines.forEach(line => {
    // Check for section header change
    const titularMatch = config.titulares.find(t => line.includes(`Final ${t.final}`));
    if (titularMatch) {
      currentTitularId = titularMatch.id;
      return;
    }

    if (line.includes("Inclusao de Pagamento")) return;

    // Regex for: Date (dd mmm) + Name + (optional Parcela) + Value (x.xxx,xx)
    const regex = /(\d{2}\s[a-z]{3})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/;
    const match = line.match(regex);

    if (match) {
      const date = match[1];
      let rawEstabelecimento = match[2];
      const rawValue = match[3];

      let parcela = "";
      const parcelaMatch = rawEstabelecimento.match(/Parcela\s+(\d+\/\d+)/);
      if (parcelaMatch) {
        parcela = parcelaMatch[1];
        rawEstabelecimento = rawEstabelecimento.replace(parcelaMatch[0], "").trim();
      }

      const valor = parseFloat(rawValue.replace(".", "").replace(",", "."));
      const isEstorno = line.toLowerCase().includes("estorno") || valor < 0;

      // Apply auto-classification
      let unidade: Cidade = "Não identificado";
      let tipo: TipoDestino = "Loja";
      
      const rule = config.rules.find(r => 
        rawEstabelecimento.toUpperCase().includes(r.keyword.replace("*", "").toUpperCase())
      );

      if (rule) {
        unidade = rule.unidade;
        tipo = rule.tipo;
      }

      // Person name heuristic: ALL CAPS, no spaces (or many initials), etc.
      if (unidade === "Não identificado" && /^[A-Z\s]+$/.test(rawEstabelecimento) && rawEstabelecimento.split(" ").length > 2) {
        tipo = "Cliente";
      }

      const isEncargo = tipo === "Encargo Bancário";

      transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        data: date,
        estabelecimento: rawEstabelecimento,
        nomeLimpo: rawEstabelecimento,
        parcela,
        valor: Math.abs(valor),
        titularId: currentTitularId,
        unidade,
        tipo,
        observacao: "",
        isEstorno,
        isEncargo
      });
    }
  });

  return transactions;
};