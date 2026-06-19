import { useState } from "react";
import {
  useGetSummary,
  getGetSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStavba } from "@/context/stavba-context";

export default function SummaryPage() {
  const { stavbaId } = useStavba();
  const { data: summary, isLoading } = useGetSummary(
    stavbaId !== null ? { stavbaId } : {},
    { query: { queryKey: getGetSummaryQueryKey(stavbaId !== null ? { stavbaId } : {}), enabled: stavbaId !== null } }
  );
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = async (type: "xls" | "pdf", options?: { categoryId?: number; categoryName?: string }) => {
    const key = options?.categoryId ? `${type}-cat-${options.categoryId}` : type;
    setIsExporting(key);
    try {
      const params = new URLSearchParams();
      if (stavbaId !== null) params.set("stavbaId", String(stavbaId));
      if (options?.categoryId !== undefined) params.set("categoryId", String(options.categoryId));

      const url = `/api/export/${type}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Export selhal");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const baseName = options?.categoryName
        ? options.categoryName.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "-").substring(0, 40)
        : "evidence-pripojek";
      a.download = `${baseName}.${type === "xls" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch {
      toast({ title: "Chyba", description: "Export se nezdařil", variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };

  if (stavbaId === null) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-lg">Není vybrána stavba</p>
          <p className="text-muted-foreground text-sm mt-1">Vyberte nebo vytvořte stavbu v levém panelu.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="text-muted-foreground text-sm">Načítám...</div>;

  const groupedRows = summary?.rows.reduce((acc, row) => {
    if (!acc[row.categoryId]) {
      acc[row.categoryId] = { name: row.categoryName, items: [] };
    }
    acc[row.categoryId].items.push(row);
    return acc;
  }, {} as Record<number, { name: string; items: typeof summary.rows }>) || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Souhrnné reporty</h1>
          <p className="text-muted-foreground mt-1">
            Celková spotřeba z {summary?.connectionCount || 0} přípojek
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("xls")}
            disabled={isExporting !== null}
            data-testid="button-export-xls"
          >
            {isExporting === "xls" ? (
              <Download className="w-4 h-4 mr-2 animate-bounce" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            Export XLS — vše
          </Button>
          <Button
            onClick={() => handleExport("pdf")}
            disabled={isExporting !== null}
            data-testid="button-export-pdf"
          >
            {isExporting === "pdf" ? (
              <Download className="w-4 h-4 mr-2 animate-bounce" />
            ) : (
              <FileIcon className="w-4 h-4 mr-2" />
            )}
            Export PDF — vše
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedRows).map(([catId, category]) => {
          const catIdNum = Number(catId);
          const xlsKey = `xls-cat-${catIdNum}`;
          const pdfKey = `pdf-cat-${catIdNum}`;
          return (
            <Card key={catId}>
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>{category.name}</CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport("xls", { categoryId: catIdNum, categoryName: category.name })}
                      disabled={isExporting !== null}
                      data-testid={`button-export-cat-xls-${catIdNum}`}
                    >
                      {isExporting === xlsKey ? (
                        <Download className="w-3.5 h-3.5 mr-1.5 animate-bounce" />
                      ) : (
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      XLS
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleExport("pdf", { categoryId: catIdNum, categoryName: category.name })}
                      disabled={isExporting !== null}
                      data-testid={`button-export-cat-pdf-${catIdNum}`}
                    >
                      {isExporting === pdfKey ? (
                        <Download className="w-3.5 h-3.5 mr-1.5 animate-bounce" />
                      ) : (
                        <FileIcon className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      PDF
                    </Button>
                  </div>
                </div>
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
                    {category.items.map((row) => (
                      <tr key={row.materialId} className="hover:bg-muted/10">
                        <td className="px-6 py-3 font-medium">{row.materialName}</td>
                        <td className="px-6 py-3 text-right font-semibold tabular-nums">{row.totalQuantity}</td>
                        <td className="px-6 py-3 text-muted-foreground">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
        {Object.keys(groupedRows).length === 0 && (
          <div className="text-center p-12 text-muted-foreground border rounded-lg bg-muted/10">
            Zatím nejsou k dispozici žádná data o materiálu pro tuto stavbu.
          </div>
        )}
      </div>
    </div>
  );
}
