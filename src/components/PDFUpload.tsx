import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFUploadProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
}


export function PDFUpload({ onUpload, isLoading: externalLoading }: PDFUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const loading = isUploading || externalLoading;

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
    try {
      await onUpload(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível processar a fatura.";
      toast({
        title: "Erro no processamento",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
          disabled={loading}
        />
        <Button disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {loading ? "Processando..." : "Selecionar PDF"}
        </Button>

      </div>
    </div>
  );
}
