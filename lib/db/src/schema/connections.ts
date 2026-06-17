import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const connectionsTable = pgTable("connections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  note: text("note"),
  copiedFromId: integer("copied_from_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(connectionsTable).omit({ id: true, createdAt: true });
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connectionsTable.$inferSelect;
