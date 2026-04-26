// Update this page (the content is just a fallback if you fail to update the page)

// IMPORTANT: Fully REPLACE this with your own code
import { useState } from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SAMPLE_TRANSACTIONS } from '../data/sampleData';

const Index = () => {
  const { transacoes, setTransacoes } = useAppContext();

  const loadDemo = () => {
    setTransacoes(SAMPLE_TRANSACTIONS);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Classificador de Fatura C6 Bank</h1>
      
      {transacoes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload de Fatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed p-12 text-center">Arraste o PDF aqui</div>
            <Button onClick={loadDemo}>Carregar dados de exemplo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Estabelecimento</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{t.data}</TableCell>
                  <TableCell>{t.estabelecimento}</TableCell>
                  <TableCell>R$ {t.valor.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Index;
