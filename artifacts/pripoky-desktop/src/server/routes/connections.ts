import { Router } from "express";
import { db } from "../db";
import { connectionsTable, connectionItemsTable } from "../schema";
import { eq, asc } from "drizzle-orm";
import {
  CreateConnectionBody,
  GetConnectionParams,
  UpdateConnectionParams,
  UpdateConnectionBody,
  DeleteConnectionParams,
  CopyConnectionParams,
  CopyConnectionBody,
  ListConnectionItemsParams,
  UpsertConnectionItemsParams,
  UpsertConnectionItemsBody,
  ListConnectionsQueryParams,
  ReorderConnectionsBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const query = ListConnectionsQueryParams.parse(req.query);
  let q = db
    .select()
    .from(connectionsTable)
    .orderBy(asc(connectionsTable.order), asc(connectionsTable.name))
    .$dynamic();
  if (query.stavbaId !== undefined) {
    q = q.where(eq(connectionsTable.stavbaId, query.stavbaId));
  }
  res.json(await q);
});

router.post("/reorder", async (req, res) => {
  const { ids } = ReorderConnectionsBody.parse(req.body);
  const updated = await Promise.all(
    ids.map((id, index) =>
      db
        .update(connectionsTable)
        .set({ order: index })
        .where(eq(connectionsTable.id, id))
        .returning()
        .then((r) => r[0])
    )
  );
  res.json(updated.filter(Boolean));
});

router.post("/", async (req, res) => {
  const body = CreateConnectionBody.parse(req.body);
  const [created] = await db
    .insert(connectionsTable)
    .values({ name: body.name, note: body.note ?? null, stavbaId: body.stavbaId ?? null })
    .returning();
  res.status(201).json(created);
});

router.get("/:id", async (req, res) => {
  const { id } = GetConnectionParams.parse(req.params);
  const [connection] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, id));
  if (!connection) return res.status(404).json({ error: "Not found" });
  const items = await db
    .select()
    .from(connectionItemsTable)
    .where(eq(connectionItemsTable.connectionId, id));
  res.json({ ...connection, items });
});

router.patch("/:id", async (req, res) => {
  const { id } = UpdateConnectionParams.parse(req.params);
  const body = UpdateConnectionBody.parse(req.body);
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.note !== undefined) updates.note = body.note;
  if (body.stavbaId !== undefined) updates.stavbaId = body.stavbaId;
  const [updated] = await db
    .update(connectionsTable)
    .set(updates)
    .where(eq(connectionsTable.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteConnectionParams.parse(req.params);
  await db.delete(connectionsTable).where(eq(connectionsTable.id, id));
  res.status(204).send();
});

router.post("/:id/copy", async (req, res) => {
  const { id } = CopyConnectionParams.parse(req.params);
  const body = CopyConnectionBody.parse(req.body);
  const [source] = await db
    .select()
    .from(connectionsTable)
    .where(eq(connectionsTable.id, id));
  if (!source) return res.status(404).json({ error: "Not found" });
  const [newConn] = await db
    .insert(connectionsTable)
    .values({
      name: body.name,
      note: body.note ?? null,
      stavbaId: body.stavbaId ?? source.stavbaId ?? null,
      copiedFromId: id,
    })
    .returning();
  const sourceItems = await db
    .select()
    .from(connectionItemsTable)
    .where(eq(connectionItemsTable.connectionId, id));
  if (sourceItems.length > 0) {
    await db.insert(connectionItemsTable).values(
      sourceItems.map((item) => ({
        connectionId: newConn.id,
        materialId: item.materialId,
        quantity: item.quantity,
      }))
    );
  }
  res.status(201).json(newConn);
});

router.get("/:id/items", async (req, res) => {
  const { id } = ListConnectionItemsParams.parse(req.params);
  const items = await db
    .select()
    .from(connectionItemsTable)
    .where(eq(connectionItemsTable.connectionId, id));
  res.json(items);
});

router.put("/:id/items", async (req, res) => {
  const { id } = UpsertConnectionItemsParams.parse(req.params);
  const body = UpsertConnectionItemsBody.parse(req.body);
  await db
    .delete(connectionItemsTable)
    .where(eq(connectionItemsTable.connectionId, id));
  if (body.items.length > 0) {
    await db.insert(connectionItemsTable).values(
      body.items.map((item) => ({
        connectionId: id,
        materialId: item.materialId,
        quantity: item.quantity,
      }))
    );
  }
  const saved = await db
    .select()
    .from(connectionItemsTable)
    .where(eq(connectionItemsTable.connectionId, id));
  res.json(saved);
});

export default router;
