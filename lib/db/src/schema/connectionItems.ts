import { pgTable, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { connectionsTable } from "./connections";
import { materialsTable } from "./materials";

export const connectionItemsTable = pgTable("connection_items", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").notNull().references(() => connectionsTable.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materialsTable.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull().default(0),
});

export const insertConnectionItemSchema = createInsertSchema(connectionItemsTable).omit({ id: true });
export type InsertConnectionItem = z.infer<typeof insertConnectionItemSchema>;
export type ConnectionItem = typeof connectionItemsTable.$inferSelect;
