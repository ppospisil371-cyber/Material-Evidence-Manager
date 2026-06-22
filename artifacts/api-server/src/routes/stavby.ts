import { Router } from "express";
import { db } from "@workspace/db";
import { stavbyTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  CreateStavbaBody,
  GetStavbaParams,
  UpdateStavbaParams,
  DeleteStavbaParams,
  UpdateStavbaBody,
  ReorderStavbyBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (_req, res) => {
  const stavby = await db.select().from(stavbyTable).orderBy(asc(stavbyTable.order), asc(stavbyTable.createdAt));
  res.json(stavby);
});

router.post("/reorder", async (req, res) => {
  const { ids } = ReorderStavbyBody.parse(req.body);
  const updated = await Promise.all(
    ids.map((id, index) =>
      db.update(stavbyTable).set({ order: index }).where(eq(stavbyTable.id, id)).returning().then((r) => r[0])
    )
  );
  res.json(updated.filter(Boolean));
});

router.post("/", async (req, res) => {
  const body = CreateStavbaBody.parse(req.body);
  const [created] = await db
    .insert(stavbyTable)
    .values({ name: body.name, note: body.note ?? null })
    .returning();
  res.status(201).json(created);
});

router.get("/:id", async (req, res) => {
  const { id } = GetStavbaParams.parse(req.params);
  const [stavba] = await db.select().from(stavbyTable).where(eq(stavbyTable.id, id));
  if (!stavba) return res.status(404).json({ error: "Not found" });
  res.json(stavba);
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateStavbaParams.parse(req.params);
  const body = UpdateStavbaBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.note !== undefined) updates.note = body.note;
  const [updated] = await db.update(stavbyTable).set(updates).where(eq(stavbyTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteStavbaParams.parse(req.params);
  await db.delete(stavbyTable).where(eq(stavbyTable.id, id));
  res.status(204).send();
});

export default router;
