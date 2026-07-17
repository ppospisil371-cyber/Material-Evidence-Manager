import { Router } from "express";
import { db } from "../db";
import { materialsTable } from "../schema";
import { eq, asc } from "drizzle-orm";
import {
  ListMaterialsQueryParams,
  CreateMaterialBody,
  UpdateMaterialParams,
  UpdateMaterialBody,
  DeleteMaterialParams,
  ReorderMaterialsBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListMaterialsQueryParams.parse(req.query);
  let q = db
    .select()
    .from(materialsTable)
    .orderBy(asc(materialsTable.order))
    .$dynamic();
  if (query.categoryId !== undefined) {
    q = q.where(eq(materialsTable.categoryId, query.categoryId));
  }
  const materials = await q;
  res.json(materials);
});

router.post("/", async (req, res) => {
  const body = CreateMaterialBody.parse(req.body);
  const existing = await db
    .select()
    .from(materialsTable)
    .where(eq(materialsTable.categoryId, body.categoryId))
    .orderBy(asc(materialsTable.order));
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((m) => m.order)) : -1;
  const [created] = await db
    .insert(materialsTable)
    .values({
      categoryId: body.categoryId,
      name: body.name,
      unit: body.unit,
      description: body.description ?? null,
      order: body.order ?? maxOrder + 1,
    })
    .returning();
  res.status(201).json(created);
});

router.post("/reorder", async (req, res) => {
  const { ids } = ReorderMaterialsBody.parse(req.body);
  const updated = await Promise.all(
    ids.map((id, index) =>
      db
        .update(materialsTable)
        .set({ order: index })
        .where(eq(materialsTable.id, id))
        .returning()
        .then((r) => r[0])
    )
  );
  res.json(updated.filter(Boolean));
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateMaterialParams.parse(req.params);
  const body = UpdateMaterialBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
  if (body.name !== undefined) updates.name = body.name;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.description !== undefined) updates.description = body.description;
  if (body.order !== undefined) updates.order = body.order;
  if (Object.keys(updates).length === 0) {
    const [existing] = await db
      .select()
      .from(materialsTable)
      .where(eq(materialsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    return res.json(existing);
  }
  const [updated] = await db
    .update(materialsTable)
    .set(updates)
    .where(eq(materialsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteMaterialParams.parse(req.params);
  await db.delete(materialsTable).where(eq(materialsTable.id, id));
  res.status(204).send();
});

export default router;
