import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const categoriesTable = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const stavbyTable = sqliteTable("stavby", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  note: text("note"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const materialsTable = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const connectionsTable = sqliteTable("connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stavbaId: integer("stavba_id").references(() => stavbyTable.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  note: text("note"),
  order: integer("order").notNull().default(0),
  copiedFromId: integer("copied_from_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const connectionItemsTable = sqliteTable("connection_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  connectionId: integer("connection_id")
    .notNull()
    .references(() => connectionsTable.id, { onDelete: "cascade" }),
  materialId: integer("material_id")
    .notNull()
    .references(() => materialsTable.id, { onDelete: "cascade" }),
  quantity: real("quantity").default(0),
});
