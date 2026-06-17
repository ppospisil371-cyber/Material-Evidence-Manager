import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import {
  useCreateConnection,
  useCopyConnection,
  useListConnections,
  getListConnectionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useStavba } from "@/context/stavba-context";
import { AlertCircle } from "lucide-react";

export default function NewConnection() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { stavbaId } = useStavba();

  const params = new URLSearchParams(search);
  const copyFromParam = params.get("copyFrom");

  const { data: connections } = useListConnections(
    stavbaId !== null ? { stavbaId } : {},
    { query: { queryKey: getListConnectionsQueryKey(stavbaId !== null ? { stavbaId } : {}), enabled: stavbaId !== null } }
  );
  const createMutation = useCreateConnection();
  const copyMutation = useCopyConnection();

  const [activeTab, setActiveTab] = useState(copyFromParam ? "copy" : "new");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [copyFromId, setCopyFromId] = useState(copyFromParam || "");

  useEffect(() => {
    if (copyFromParam) {
      setActiveTab("copy");
      setCopyFromId(copyFromParam);
    }
  }, [copyFromParam]);

  if (stavbaId === null) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-center border rounded-lg bg-muted/20">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">Není vybrána stavba</p>
            <p className="text-muted-foreground text-sm mt-1">Vyberte nebo vytvořte stavbu v levém panelu.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Chyba", description: "Zadejte název/adresu přípojky", variant: "destructive" });
      return;
    }

    try {
      let newConn;
      if (activeTab === "new") {
        newConn = await createMutation.mutateAsync({
          data: { name, note: note || undefined, stavbaId: stavbaId ?? undefined }
        });
      } else {
        if (!copyFromId) {
          toast({ title: "Chyba", description: "Vyberte přípojku ke kopírování", variant: "destructive" });
          return;
        }
        newConn = await copyMutation.mutateAsync({
          id: parseInt(copyFromId),
          data: { name, note: note || undefined, stavbaId: stavbaId ?? undefined }
        });
      }

      queryClient.invalidateQueries({ queryKey: getListConnectionsQueryKey(stavbaId !== null ? { stavbaId } : {}) });
      toast({ title: "Úspěch", description: "Přípojka byla vytvořena" });
      setLocation(`/connections/${newConn.id}`);
    } catch (err) {
      toast({ title: "Chyba", description: "Nepodařilo se vytvořit přípojku", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Nová přípojka</h1>

      <Card>
        <CardHeader>
          <CardTitle>Vytvoření záznamu</CardTitle>
          <CardDescription>Zadejte adresu nebo jiný identifikátor přípojky</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="new">Zcela nová</TabsTrigger>
              <TabsTrigger value="copy">Kopírovat existující</TabsTrigger>
            </TabsList>

            <form id="connection-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Název / Adresa <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="např. Novákových 12, Praha"
                  autoFocus
                  data-testid="input-connection-name"
                />
              </div>

              {activeTab === "copy" && (
                <div className="space-y-2">
                  <Label htmlFor="copyFrom">Kopírovat z <span className="text-destructive">*</span></Label>
                  <Select value={copyFromId} onValueChange={setCopyFromId}>
                    <SelectTrigger data-testid="select-copy-from">
                      <SelectValue placeholder="Vyberte existující přípojku..." />
                    </SelectTrigger>
                    <SelectContent>
                      {connections?.map(conn => (
                        <SelectItem key={conn.id} value={conn.id.toString()}>
                          {conn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Zkopíruje se veškerý zadaný materiál z vybrané přípojky.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="note">Poznámka (volitelné)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Doplňující informace k realizaci..."
                  rows={3}
                  data-testid="textarea-connection-note"
                />
              </div>
            </form>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t pt-6 mt-2">
          <Button variant="outline" onClick={() => setLocation("/")}>
            Zrušit
          </Button>
          <Button
            type="submit"
            form="connection-form"
            disabled={createMutation.isPending || copyMutation.isPending}
            data-testid="button-submit-connection"
          >
            {createMutation.isPending || copyMutation.isPending ? "Ukládám..." : "Vytvořit přípojku"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
