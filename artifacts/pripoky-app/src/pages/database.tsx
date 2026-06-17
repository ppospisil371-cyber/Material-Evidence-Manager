import { useState } from "react";
import { 
  useListCategories, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory,
  useListMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  getListCategoriesQueryKey,
  getListMaterialsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "recharts";

export default function DatabasePage() {
  const { data: categories } = useListCategories();
  const { data: materials } = useListMaterials();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();

  const [newCatName, setNewCatName] = useState("");
  const [newMatState, setNewMatState] = useState<Record<number, { name: string, unit: string, desc: string }>>({});

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createCategory.mutateAsync({ data: { name: newCatName, order: (categories?.length || 0) + 1 } });
      setNewCatName("");
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast({ title: "Kategorie vytvořena" });
    } catch (e) {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

  const handleCreateMaterial = async (categoryId: number) => {
    const state = newMatState[categoryId];
    if (!state?.name.trim() || !state?.unit.trim()) {
      toast({ title: "Chyba", description: "Vyplňte název a jednotku", variant: "destructive" });
      return;
    }
    try {
      await createMaterial.mutateAsync({
        data: {
          categoryId,
          name: state.name,
          unit: state.unit,
          description: state.desc || undefined,
          order: 999
        }
      });
      setNewMatState(prev => ({ ...prev, [categoryId]: { name: "", unit: "", desc: "" } }));
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
      toast({ title: "Materiál přidán" });
    } catch (e) {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Opravdu smazat kategorii?")) return;
    try {
      await deleteCategory.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
    } catch (e) {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm("Opravdu smazat materiál?")) return;
    try {
      await deleteMaterial.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
    } catch (e) {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

  const sortedCategories = categories ? [...categories].sort((a,b) => a.order - b.order) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Databáze materiálu</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <Input 
              placeholder="Název nové kategorie (např. Zemní práce)" 
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={createCategory.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Přidat kategorii
            </Button>
          </form>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="w-full space-y-4">
        {sortedCategories.map((category) => {
          const catMaterials = materials?.filter(m => m.categoryId === category.id).sort((a,b) => a.order - b.order) || [];
          const formState = newMatState[category.id] || { name: "", unit: "", desc: "" };

          return (
            <AccordionItem value={`cat-${category.id}`} key={category.id} className="border bg-card rounded-lg shadow-sm px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-semibold text-lg">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-normal text-muted-foreground mr-4">
                      {catMaterials.length} položek
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-4 border-t mt-2">
                <div className="space-y-2">
                  {catMaterials.map(mat => (
                    <div key={mat.id} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded group">
                      <div className="flex-1 grid grid-cols-12 gap-4">
                        <div className="col-span-4 font-medium">{mat.name}</div>
                        <div className="col-span-2 text-muted-foreground">{mat.unit}</div>
                        <div className="col-span-6 text-sm text-muted-foreground truncate">{mat.description}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleDeleteMaterial(mat.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {catMaterials.length === 0 && (
                    <div className="text-muted-foreground text-sm py-2 italic">Žádný materiál v této kategorii.</div>
                  )}
                </div>

                <div className="flex items-end gap-3 mt-4 pt-4 border-t bg-muted/10 p-4 rounded-md">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Název</Label>
                    <Input 
                      placeholder="Trubka PE 32" 
                      value={formState.name}
                      onChange={e => setNewMatState(prev => ({ ...prev, [category.id]: { ...formState, name: e.target.value } }))}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Jednotka</Label>
                    <Input 
                      placeholder="m" 
                      value={formState.unit}
                      onChange={e => setNewMatState(prev => ({ ...prev, [category.id]: { ...formState, unit: e.target.value } }))}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Popis (volitelné)</Label>
                    <Input 
                      placeholder="SDR 11, role 100m" 
                      value={formState.desc}
                      onChange={e => setNewMatState(prev => ({ ...prev, [category.id]: { ...formState, desc: e.target.value } }))}
                    />
                  </div>
                  <Button onClick={() => handleCreateMaterial(category.id)} disabled={createMaterial.isPending}>
                    <Plus className="w-4 h-4" /> Přidat
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
