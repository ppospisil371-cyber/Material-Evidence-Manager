import { useListConnections, useDeleteConnection, getListConnectionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ArrowRight, Trash2, Copy, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useStavba } from "@/context/stavba-context";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { stavbaId } = useStavba();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useListConnections(
    stavbaId !== null ? { stavbaId } : {},
    { query: { queryKey: getListConnectionsQueryKey(stavbaId !== null ? { stavbaId } : {}), enabled: stavbaId !== null } }
  );

  const deleteMutation = useDeleteConnection();

  const handleDelete = async (id: number, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Opravdu smazat přípojku "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey(stavbaId !== null ? { stavbaId } : {}) });
      toast({ title: "Přípojka smazána" });
    } catch {
      toast({ title: "Chyba", description: "Nepodařilo se smazat přípojku", variant: "destructive" });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Přehled přípojek</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading ? "" : `${connections.length} ${connections.length === 1 ? "přípojka" : connections.length >= 2 && connections.length <= 4 ? "přípojky" : "přípojek"} v této stavbě`}
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/connections/new" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nová přípojka
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Načítám...</div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
          <FileText className="w-12 h-12 mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">Zatím žádné přípojky v této stavbě.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/connections/new">Vytvořit první</Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Adresa / název</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Vytvořeno</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Poznámka</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {connections.map((conn) => (
                <tr
                  key={conn.id}
                  data-testid={`row-connection-${conn.id}`}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/connections/${conn.id}`}
                      className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                    >
                      {conn.name}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {format(new Date(conn.createdAt), "d.M.yyyy", { locale: cs })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {conn.note || <span className="opacity-0">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Kopírovat"
                      >
                        <Link href={`/connections/new?copyFrom=${conn.id}`}>
                          <Copy className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        title="Smazat"
                        onClick={(e) => handleDelete(conn.id, conn.name, e)}
                        data-testid={`button-delete-connection-${conn.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
