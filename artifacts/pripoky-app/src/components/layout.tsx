import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { FileText, Database, LayoutDashboard, Plus, BarChart2, Building2, ChevronDown, Check, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { useListStavby, useCreateStavba, useDeleteStavba, useUpdateStavba, getListStavbyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStavba } from "@/context/stavba-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function StavbaSelector() {
  const { stavbaId, setStavbaId } = useStavba();
  const { data: stavby = [] } = useListStavby();
  const createMutation = useCreateStavba();
  const updateMutation = useUpdateStavba();
  const deleteMutation = useDeleteStavba();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const currentStavba = stavby.find((s) => s.id === stavbaId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const created = await createMutation.mutateAsync({ data: { name: newName.trim() } });
      queryClient.invalidateQueries({ queryKey: getListStavbyQueryKey() });
      setStavbaId(created.id);
      setNewName("");
      toast({ title: "Stavba vytvořena", description: created.name });
    } catch {
      toast({ title: "Chyba", description: "Nepodařilo se vytvořit stavbu", variant: "destructive" });
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      await updateMutation.mutateAsync({ id, data: { name: editingName.trim() } });
      queryClient.invalidateQueries({ queryKey: getListStavbyQueryKey() });
      setEditingId(null);
    } catch {
      toast({ title: "Chyba", description: "Nepodařilo se upravit stavbu", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListStavbyQueryKey() });
      if (stavbaId === id) setStavbaId(null);
    } catch {
      toast({ title: "Chyba", description: "Nepodařilo se smazat stavbu", variant: "destructive" });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="stavba-selector"
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left",
            "bg-sidebar-accent/60 hover:bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Building2 className="w-4 h-4 shrink-0 text-accent" />
          <span className="flex-1 truncate">
            {currentStavba ? currentStavba.name : "Vyberte stavbu..."}
          </span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" side="right" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mb-1">
          Stavby
        </p>
        <div className="space-y-0.5 max-h-56 overflow-y-auto">
          {stavby.map((s) => (
            <div key={s.id} className="flex items-center gap-1 group">
              {editingId === s.id ? (
                <div className="flex gap-1 flex-1 pr-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdate(s.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdate(s.id)}>
                    <Check className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    className={cn(
                      "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left",
                      stavbaId === s.id && "font-semibold"
                    )}
                    onClick={() => { setStavbaId(s.id); setOpen(false); }}
                    data-testid={`stavba-item-${s.id}`}
                  >
                    {stavbaId === s.id && <Check className="w-3 h-3 shrink-0 text-primary" />}
                    <span className={cn("truncate", stavbaId !== s.id && "pl-5")}>{s.name}</span>
                  </button>
                  <div className="hidden group-hover:flex gap-0.5">
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0"
                      onClick={() => { setEditingId(s.id); setEditingName(s.name); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-6 w-6 p-0 hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {stavby.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-2">Zatím žádné stavby.</p>
          )}
        </div>
        <div className="border-t mt-2 pt-2 flex gap-1">
          <Input
            placeholder="Název nové stavby..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="h-7 text-sm"
            data-testid="input-new-stavba"
          />
          <Button
            size="sm" variant="outline" className="h-7 px-2 shrink-0"
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
            data-testid="button-create-stavba"
          >
            <PlusCircle className="w-3 h-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Přehled", icon: LayoutDashboard },
    { href: "/connections/new", label: "Nová přípojka", icon: Plus },
    { href: "/database", label: "Databáze materiálu", icon: Database },
    { href: "/summary", label: "Souhrnné reporty", icon: BarChart2 },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4 border-b">
            <h1 className="text-xl font-bold text-sidebar-primary-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Evidence přípojek
            </h1>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <div className="mb-3">
              <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 py-1">
                Stavba
              </p>
              <StavbaSelector />
            </div>
            <div className="border-t border-sidebar-border pt-2">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
