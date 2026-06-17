import { useListConnections } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function Dashboard() {
  const { data: connections, isLoading } = useListConnections();

  const recentConnections = connections?.slice(0, 10) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Přehled přípojek</h1>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/connections/new" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nová přípojka
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkem evidováno
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : connections?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Nedávné záznamy</h2>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Načítám...</div>
        ) : recentConnections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p>Zatím nebyly vytvořeny žádné přípojky.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/connections/new">Vytvořit první</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentConnections.map((conn) => (
              <Card key={conn.id} className="hover:border-primary/50 transition-colors shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{conn.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <Calendar className="w-4 h-4 mr-2" />
                    {format(new Date(conn.createdAt), "d. MMMM yyyy", { locale: cs })}
                  </div>
                  {conn.note && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {conn.note}
                    </p>
                  )}
                  <Button asChild variant="secondary" className="w-full justify-between group">
                    <Link href={`/connections/${conn.id}`}>
                      Otevřít záznam
                      <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
