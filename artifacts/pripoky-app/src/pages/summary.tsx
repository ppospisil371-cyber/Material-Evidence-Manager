import { useState } from "react";
import { 
  useGetSummary, 
  getGetSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileIcon } from "lucide-react";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch"; // need to build raw fetch for blob
import { useToast } from "@/hooks/use-toast";

export default function SummaryPage() {
  const { data: summary, isLoading } = useGetSummary();
  const { toast } = useToast();
  
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (type: "xls" | "pdf") => {
    setIsExporting(type);
    try {
      const response = await fetch(`/api/summary/export/${type}`);
      if (!response.ok) throw new Error('Export selhal');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `souhrn-materialu.${type === 'xls' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast({ title: "Chyba", description: "Export se nezdařil", variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };

  if (isLoading) return <div>Načítám...</div>;

  const groupedRows = summary?.rows.reduce((acc, row) => {
    if (!acc[row.categoryId]) {
      acc[row.categoryId] = {
        name: row.categoryName,
        items: []
      };
    }
    acc[row.categoryId].items.push(row);
    return acc;
  }, {} as Record<number, { name: string, items: typeof summary.rows }>) || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Souhrnné reporty</h1>
          <p className="text-muted-foreground mt-1">Celková spotřeba z {summary?.connectionCount || 0} přípojek</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleExport("xls")}
            disabled={isExporting !== null}
          >
            {isExporting === "xls" ? <Download className="w-4 h-4 mr-2 animate-bounce" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Export XLS
          </Button>
          <Button 
            onClick={() => handleExport("pdf")}
            disabled={isExporting !== null}
          >
            {isExporting === "pdf" ? <Download className="w-4 h-4 mr-2 animate-bounce" /> : <FileIcon className="w-4 h-4 mr-2" />}
            Export PDF
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedRows).map(([catId, category]) => (
          <Card key={catId}>
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle>{category.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Materiál</th>
                    <th className="px-6 py-3 font-medium text-right w-32">Množství</th>
                    <th className="px-6 py-3 font-medium w-24">Jednotka</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {category.items.map(row => (
                    <tr key={row.materialId} className="hover:bg-muted/10">
                      <td className="px-6 py-3 font-medium">{row.materialName}</td>
                      <td className="px-6 py-3 text-right font-semibold">{row.totalQuantity}</td>
                      <td className="px-6 py-3 text-muted-foreground">{row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
        {Object.keys(groupedRows).length === 0 && (
          <div className="text-center p-12 text-muted-foreground">
            Zatím nejsou k dispozici žádná data o materiálu.
          </div>
        )}
      </div>
    </div>
  );
}
