const transactionRegex = /(\d{2}\/\d{2})\s+(.*?)\s+(?:(\d+\/\d+)\s+)?(-?\d+(?:\.\d+)?,\d{2})/g;
const text = `
05/05 AMAZON.COM.BR 89,90
10/05 REGINA PANIFICADORA 2/10 45,00
12/05 ESTORNO COMPRA -15,99
15/05 LOJA 123 1.100,00
`;
let match;
while ((match = transactionRegex.exec(text)) !== null) {
  console.log({
    date: match[1],
    desc: match[2],
    parcela: match[3],
    valor: match[4]
  });
}
