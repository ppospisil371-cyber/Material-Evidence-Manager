import { Router } from "express";
import { db } from "@workspace/db";
import { connectionsTable, connectionItemsTable, materialsTable, categoriesTable } from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const rawStavbaId = req.query.stavbaId;
  const stavbaId = rawStavbaId !== undefined ? parseInt(rawStavbaId as string) : undefined;

  let connectionsQuery = db.select().from(connectionsTable).$dynamic();
  if (stavbaId !== undefined && !isNaN(stavbaId)) {
    connectionsQuery = connectionsQuery.where(eq(connectionsTable.stavbaId, stavbaId));
  }
  const connections = await connectionsQuery;
  const connectionIds = connections.map((c) => c.id);

  const allItems =
    connectionIds.length > 0
      ? await db
          .select({
            materialId: connectionItemsTable.materialId,
            quantity: connectionItemsTable.quantity,
            materialName: materialsTable.name,
            unit: materialsTable.unit,
            categoryId: materialsTable.categoryId,
          })
          .from(connectionItemsTable)
          .innerJoin(materialsTable, eq(connectionItemsTable.materialId, materialsTable.id))
          .where(inArray(connectionItemsTable.connectionId, connectionIds))
      : [];

  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.order));
  const catMap = new Map(cats.map((c) => [c.id, c.name]));

  const totals = new Map<
    number,
    { materialId: number; materialName: string; unit: string; categoryId: number; categoryName: string; totalQuantity: number }
  >();

  for (const item of allItems) {
    const existing = totals.get(item.materialId);
    if (existing) {
      existing.totalQuantity += item.quantity ?? 0;
    } else {
      totals.set(item.materialId, {
        materialId: item.materialId,
        materialName: item.materialName,
        unit: item.unit,
        categoryId: item.categoryId,
        categoryName: catMap.get(item.categoryId) ?? "Ostatní",
        totalQuantity: item.quantity ?? 0,
      });
    }
  }

  const rows = Array.from(totals.values()).sort((a, b) =>
    a.categoryId !== b.categoryId ? a.categoryId - b.categoryId : a.materialId - b.materialId
  );

  res.json({ rows, connectionCount: connections.length });
});

export default router;
