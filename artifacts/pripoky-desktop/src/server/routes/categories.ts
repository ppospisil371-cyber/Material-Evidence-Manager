import { Router } from "express";
import { db } from "../db";
import { categoriesTable } from "../schema";
import { eq, asc } from "drizzle-orm";
import {
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
  ReorderCategoriesBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.order));
  res.json(categories);
});

router.post("/", async (req, res) => {
  const body = CreateCategoryBody.parse(req.body);
  const existing = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.order));
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((c) => c.order)) : -1;
  const [created] = await db
    .insert(categoriesTable)
    .values({ name: body.name, order: body.order ?? maxOrder + 1 })
    .returning();
  res.status(201).json(created);
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateCategoryParams.parse(req.params);
  const body = UpdateCategoryBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.order !== undefined) updates.order = body.order;
  if (Object.keys(updates).length === 0) {
    const [existing] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    return res.json(existing);
  }
  const [updated] = await db
    .update(categoriesTable)
    .set(updates)
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteCategoryParams.parse(req.params);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

router.post("/reorder", async (req, res) => {
  const { ids } = ReorderCategoriesBody.parse(req.body);
  const updated = await Promise.all(
    ids.map((id, index) =>
      db
        .update(categoriesTable)
        .set({ order: index })
        .where(eq(categoriesTable.id, id))
        .returning()
        .then((rows) => rows[0])
    )
  );
  res.json(updated.filter(Boolean));
});

export default router;
