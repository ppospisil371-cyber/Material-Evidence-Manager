import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stavbyTable = pgTable("stavby", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  note: text("note"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStavbaSchema = createInsertSchema(stavbyTable).omit({ id: true, createdAt: true });
export type InsertStavba = z.infer<typeof insertStavbaSchema>;
export type Stavba = typeof stavbyTable.$inferSelect;
