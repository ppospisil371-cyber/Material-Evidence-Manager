import { useState } from "react";
import {
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
  useListMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useReorderMaterials,
  getListCategoriesQueryKey,
  getListMaterialsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Category = { id: number; name: string; order: number; createdAt: string };
type Material = {
  id: number;
  categoryId: number;
  name: string;
  unit: string;
  description?: string | null;
  order: number;
  createdAt: string;
};

function SortableMaterialRow({
  mat,
  onDelete,
}: {
  mat: Material;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: mat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded group"
      data-testid={`row-material-${mat.id}`}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </span>
      <div className="flex-1 grid grid-cols-12 gap-4 min-w-0">
        <div className="col-span-5 font-medium truncate">{mat.name}</div>
        <div className="col-span-2 text-muted-foreground">{mat.unit}</div>
        <div className="col-span-5 text-sm text-muted-foreground truncate">{mat.description}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
        onClick={() => onDelete(mat.id)}
        data-testid={`button-delete-material-${mat.id}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function CategorySection({
  category,
  materials,
  onDeleteCategory,
  onDeleteMaterial,
  onReorderMaterials,
}: {
  category: Category;
  materials: Material[];
  onDeleteCategory: (id: number) => void;
  onDeleteMaterial: (id: number) => void;
  onReorderMaterials: (categoryId: number, ids: number[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  const [open, setOpen] = useState(true);
  const [newMatState, setNewMatState] = useState({ name: "", unit: "", desc: "" });
  const [localOrder, setLocalOrder] = useState<number[] | null>(null);
  const { toast } = useToast();
  const createMaterial = useCreateMaterial();
  const queryClient = useQueryClient();

  const orderedMaterials = localOrder
    ? localOrder.map((id) => materials.find((m) => m.id === id)!).filter(Boolean)
    : materials;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = localOrder ?? materials.map((m) => m.id);
    const newOrder = arrayMove(oldOrder, oldOrder.indexOf(Number(active.id)), oldOrder.indexOf(Number(over.id)));
    setLocalOrder(newOrder);
    onReorderMaterials(category.id, newOrder);
  };

  const handleAddMaterial = async () => {
    if (!newMatState.name.trim() || !newMatState.unit.trim()) {
      toast({ title: "Chyba", description: "Vyplňte název a jednotku", variant: "destructive" });
      return;
    }
    try {
      await createMaterial.mutateAsync({
        data: {
          categoryId: category.id,
          name: newMatState.name,
          unit: newMatState.unit,
          description: newMatState.desc || undefined,
          order: materials.length,
        },
      });
      setNewMatState({ name: "", unit: "", desc: "" });
      setLocalOrder(null);
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
      toast({ title: "Materiál přidán" });
    } catch {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between pr-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors px-2 shrink-0"
            title="Přetáhnout pro změnu pořadí kategorií"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </span>
          <div
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className="font-semibold text-base truncate">{category.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">({materials.length} položek)</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive opacity-50 hover:opacity-100 shrink-0"
          onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }}
          data-testid={`button-delete-category-${category.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {open && (
        <div className="border-t px-4 pt-3 pb-4 space-y-3">
          {orderedMaterials.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedMaterials.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {orderedMaterials.map((mat) => (
                    <SortableMaterialRow key={mat.id} mat={mat} onDelete={onDeleteMaterial} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-muted-foreground text-sm italic py-1">Žádný materiál v této kategorii.</p>
          )}

          <div className="flex items-end gap-2 pt-3 border-t bg-muted/10 p-3 rounded-md">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`mat-name-${category.id}`} className="text-xs">Název</Label>
              <Input
                id={`mat-name-${category.id}`}
                placeholder="Trubka PE 32"
                value={newMatState.name}
                onChange={(e) => setNewMatState((s) => ({ ...s, name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddMaterial(); }}
                data-testid={`input-mat-name-${category.id}`}
              />
            </div>
            <div className="w-20 space-y-1">
              <Label htmlFor={`mat-unit-${category.id}`} className="text-xs">Jednotka</Label>
              <Input
                id={`mat-unit-${category.id}`}
                placeholder="m"
                value={newMatState.unit}
                onChange={(e) => setNewMatState((s) => ({ ...s, unit: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddMaterial(); }}
                data-testid={`input-mat-unit-${category.id}`}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor={`mat-desc-${category.id}`} className="text-xs">Popis (volitelné)</Label>
              <Input
                id={`mat-desc-${category.id}`}
                placeholder="SDR 11, role 100m"
                value={newMatState.desc}
                onChange={(e) => setNewMatState((s) => ({ ...s, desc: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddMaterial(); }}
                data-testid={`input-mat-desc-${category.id}`}
              />
            </div>
            <Button
              onClick={handleAddMaterial}
              disabled={createMaterial.isPending}
              className="shrink-0"
              data-testid={`button-add-material-${category.id}`}
            >
              <Plus className="w-4 h-4 mr-1" /> Přidat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DatabasePage() {
  const { data: categories = [] } = useListCategories();
  const { data: materials = [] } = useListMaterials();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const deleteMaterial = useDeleteMaterial();
  const reorderCategories = useReorderCategories();
  const reorderMaterials = useReorderMaterials();

  const [newCatName, setNewCatName] = useState("");
  const [localCatOrder, setLocalCatOrder] = useState<number[] | null>(null);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const orderedCategories = localCatOrder
    ? localCatOrder.map((id) => sortedCategories.find((c) => c.id === id)!).filter(Boolean)
    : sortedCategories;

  const catSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCatDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldOrder = localCatOrder ?? sortedCategories.map((c) => c.id);
    const newOrder = arrayMove(oldOrder, oldOrder.indexOf(Number(active.id)), oldOrder.indexOf(Number(over.id)));
    setLocalCatOrder(newOrder);
    try {
      await reorderCategories.mutateAsync({ data: { ids: newOrder } });
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    } catch {
      setLocalCatOrder(oldOrder);
      toast({ title: "Chyba", description: "Nepodařilo se změnit pořadí kategorií", variant: "destructive" });
    }
  };

  const handleReorderMaterials = async (categoryId: number, ids: number[]) => {
    try {
      await reorderMaterials.mutateAsync({ data: { ids } });
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
    } catch {
      toast({ title: "Chyba", description: "Nepodařilo se změnit pořadí materiálů", variant: "destructive" });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createCategory.mutateAsync({ data: { name: newCatName, order: categories.length } });
      setNewCatName("");
      setLocalCatOrder(null);
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      toast({ title: "Kategorie vytvořena" });
    } catch {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Opravdu smazat kategorii a veškerý její materiál?")) return;
    try {
      await deleteCategory.mutateAsync({ id });
      setLocalCatOrder(null);
      queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
    } catch {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm("Opravdu smazat materiál?")) return;
    try {
      await deleteMaterial.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMaterialsQueryKey() });
    } catch {
      toast({ title: "Chyba", variant: "destructive" });
    }
  };

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
              onChange={(e) => setNewCatName(e.target.value)}
              className="max-w-sm"
              data-testid="input-new-category"
            />
            <Button type="submit" disabled={createCategory.isPending} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" /> Přidat kategorii
            </Button>
          </form>
        </CardContent>
      </Card>

      <DndContext sensors={catSensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
        <SortableContext items={orderedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {orderedCategories.map((category) => {
              const catMaterials = materials
                .filter((m) => m.categoryId === category.id)
                .sort((a, b) => a.order - b.order);
              return (
                <CategorySection
                  key={category.id}
                  category={category}
                  materials={catMaterials}
                  onDeleteCategory={handleDeleteCategory}
                  onDeleteMaterial={handleDeleteMaterial}
                  onReorderMaterials={handleReorderMaterials}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

