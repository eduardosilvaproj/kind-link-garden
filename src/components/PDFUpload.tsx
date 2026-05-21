import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFUploadProps {
  onUpload: (file: File) => void;
}

export function PDFUpload({ onUpload }: PDFUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    // Simulating processing
    setTimeout(() => {
      onUpload(file);
      setIsUploading(false);
      toast({
        title: "Fatura processada",
        description: "Os dados de Maio foram carregados com sucesso.",
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-12 bg-white gap-4">
      <div className="bg-slate-100 p-4 rounded-full">
        <FileText className="w-8 h-8 text-slate-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Upload da Fatura de Maio</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          Arraste o PDF da sua fatura do C6 Bank ou clique no botão abaixo para processar.
        </p>
      </div>
      <div className="relative">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <Button disabled={isUploading} className="gap-2">
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {isUploading ? "Processando..." : "Selecionar PDF"}
        </Button>
      </div>
    </div>
  );
}
