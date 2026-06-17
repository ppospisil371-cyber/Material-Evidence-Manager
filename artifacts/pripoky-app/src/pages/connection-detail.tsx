import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { 
  useGetConnection, 
  useListCategories, 
  useListMaterials, 
  useListConnectionItems,
  useUpsertConnectionItems,
  getGetConnectionQueryKey,
  getListConnectionItemsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default function ConnectionDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const connectionId = id ? parseInt(id) : 0;

  const { data: connection, isLoading: isLoadingConnection } = useGetConnection(connectionId, {
    query: { enabled: !!connectionId, queryKey: getGetConnectionQueryKey(connectionId) }
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  const { data: materials, isLoading: isLoadingMaterials } = useListMaterials();
  const { data: items, isLoading: isLoadingItems } = useListConnectionItems(connectionId, {
    query: { enabled: !!connectionId, queryKey: getListConnectionItemsQueryKey(connectionId) }
  });

  const upsertItemsMutation = useUpsertConnectionItems();

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [hideEmpty, setHideEmpty] = useState(false);
  
  const initializedRef = useRef(false);

  useEffect(() => {
    if (items && materials && !initializedRef.current) {
      const initialQuantities: Record<number, number> = {};
      items.forEach(item => {
        initialQuantities[item.materialId] = item.quantity;
      });
      setQuantities(initialQuantities);
      initializedRef.current = true;
    }
  }, [items, materials]);

  const handleQuantityChange = (materialId: number, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    setQuantities(prev => ({
      ...prev,
      [materialId]: isNaN(num) ? 0 : num
    }));
  };

  const handleSave = async () => {
    try {
      const itemsToSave = Object.entries(quantities)
        .map(([materialId, quantity]) => ({
          materialId: parseInt(materialId),
          quantity
        }))
        .filter(item => item.quantity > 0);

      await upsertItemsMutation.mutateAsync({
        id: connectionId,
        data: { items: itemsToSave }
      });

      queryClient.invalidateQueries({ queryKey: getListConnectionItemsQueryKey(connectionId) });
      toast({ title: "Uloženo", description: "Záznam materiálu byl úspěšně uložen." });
    } catch (err) {
      toast({ title: "Chyba", description: "Nepodařilo se uložit materiál", variant: "destructive" });
    }
  };

  const isLoading = isLoadingConnection || isLoadingCategories || isLoadingMaterials || isLoadingItems;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!connection) {
    return <div>Přípojka nenalezena</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{connection.name}</h1>
            <p className="text-sm text-muted-foreground">
              Vytvořeno: {format(new Date(connection.createdAt), "d. MMMM yyyy HH:mm", { locale: cs })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="hide-empty" checked={hideEmpty} onCheckedChange={setHideEmpty} />
            <Label htmlFor="hide-empty">Skrýt nevyplněné</Label>
          </div>
          <Button onClick={handleSave} disabled={upsertItemsMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {upsertItemsMutation.isPending ? "Ukládám..." : "Uložit"}
          </Button>
        </div>
      </div>

      {connection.note && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-sm">
            <strong>Poznámka:</strong> {connection.note}
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {categories?.sort((a,b) => a.order - b.order).map(category => {
          const categoryMaterials = materials
            ?.filter(m => m.categoryId === category.id)
            .sort((a,b) => a.order - b.order) || [];
            
          const visibleMaterials = hideEmpty 
            ? categoryMaterials.filter(m => quantities[m.id] && quantities[m.id] > 0)
            : categoryMaterials;

          if (visibleMaterials.length === 0) return null;

          return (
            <Card key={category.id}>
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y border-t">
                  {visibleMaterials.map(material => (
                    <div key={material.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                      <div className="flex-1">
                        <Label htmlFor={`mat-${material.id}`} className="font-medium text-base cursor-pointer">
                          {material.name}
                        </Label>
                        {material.description && (
                          <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 w-48 justify-end">
                        <Input
                          id={`mat-${material.id}`}
                          type="number"
                          min="0"
                          step="any"
                          className="w-24 text-right text-lg font-semibold"
                          value={quantities[material.id] === 0 ? "" : quantities[material.id] || ""}
                          onChange={(e) => handleQuantityChange(material.id, e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-sm text-muted-foreground w-10">{material.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {categories?.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            Zatím nebyly vytvořeny žádné kategorie.
          </div>
        )}
      </div>
      
      {/* Sticky footer for saving */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t flex justify-end z-10 lg:pl-64">
        <div className="max-w-6xl mx-auto w-full flex justify-end gap-4 items-center px-6">
          <span className="text-sm text-muted-foreground">Nezapomeňte průběžně ukládat změny</span>
          <Button size="lg" onClick={handleSave} disabled={upsertItemsMutation.isPending}>
            <Save className="w-5 h-5 mr-2" />
            {upsertItemsMutation.isPending ? "Ukládám..." : "Uložit změny"}
          </Button>
        </div>
      </div>
    </div>
  );
}
