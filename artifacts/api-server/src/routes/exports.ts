import { Router } from "express";
import { db } from "@workspace/db";
import { connectionsTable, connectionItemsTable, materialsTable, categoriesTable } from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

const router = Router();

function buildContentDisposition(disposition: "attachment" | "inline", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

async function buildExportData(stavbaId?: number, categoryId?: number) {
  let connectionsQuery = db
    .select()
    .from(connectionsTable)
    .orderBy(asc(connectionsTable.order), asc(connectionsTable.name))
    .$dynamic();
  if (stavbaId !== undefined && !isNaN(stavbaId)) {
    connectionsQuery = connectionsQuery.where(eq(connectionsTable.stavbaId, stavbaId));
  }
  const connections = await connectionsQuery;
  const connectionIds = connections.map((c) => c.id);

  let catsQuery = db.select().from(categoriesTable).orderBy(asc(categoriesTable.order)).$dynamic();
  if (categoryId !== undefined && !isNaN(categoryId)) {
    catsQuery = catsQuery.where(eq(categoriesTable.id, categoryId));
  }
  const cats = await catsQuery;

  let matsQuery = db.select().from(materialsTable).orderBy(asc(materialsTable.order)).$dynamic();
  if (categoryId !== undefined && !isNaN(categoryId)) {
    matsQuery = matsQuery.where(eq(materialsTable.categoryId, categoryId));
  }
  const materials = await matsQuery;

  const allItems =
    connectionIds.length > 0
      ? await db
          .select()
          .from(connectionItemsTable)
          .where(inArray(connectionItemsTable.connectionId, connectionIds))
      : [];

  return { connections, cats, materials, allItems };
}

router.get("/xls", async (req, res) => {
  const rawStavbaId = req.query.stavbaId;
  const rawCategoryId = req.query.categoryId;
  const stavbaId = rawStavbaId !== undefined ? parseInt(rawStavbaId as string) : undefined;
  const categoryId = rawCategoryId !== undefined ? parseInt(rawCategoryId as string) : undefined;

  const { connections, cats, materials, allItems } = await buildExportData(stavbaId, categoryId);

  const wb = XLSX.utils.book_new();

  const totalByMaterial = new Map<number, number>();
  for (const item of allItems) {
    totalByMaterial.set(item.materialId, (totalByMaterial.get(item.materialId) ?? 0) + (item.quantity ?? 0));
  }

  const summaryRows: (string | number)[][] = [
    ["Sekce", "Materiál", "Jednotka", "Celkové množství"],
  ];
  for (const cat of cats) {
    const catMaterials = materials.filter((m) => m.categoryId === cat.id);
    for (const mat of catMaterials) {
      const total = totalByMaterial.get(mat.id) ?? 0;
      if (total > 0) {
        summaryRows.push([cat.name, mat.name, mat.unit, total]);
      }
    }
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Souhrn");

  for (const conn of connections) {
    const connItems = allItems.filter((i) => i.connectionId === conn.id);
    const rows: (string | number)[][] = [
      ["Sekce", "Materiál", "Jednotka", "Množství"],
    ];
    for (const cat of cats) {
      const catMaterials = materials.filter((m) => m.categoryId === cat.id);
      for (const mat of catMaterials) {
        const item = connItems.find((i) => i.materialId === mat.id);
        const qty = item?.quantity ?? 0;
        if (qty > 0) {
          rows.push([cat.name, mat.name, mat.unit, qty]);
        }
      }
    }
    const safeTitle = conn.name.substring(0, 31).replace(/[\\/*?[\]:]/g, "_");
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, safeTitle || `Prip_${conn.id}`);
  }

  const catName = cats.length === 1 ? cats[0].name : null;
  const filename = catName ? `${catName}.xlsx` : "evidence-pripojek.xlsx";

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", buildContentDisposition("attachment", filename));
  res.send(buf);
});

const FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

router.get("/pdf", async (req, res) => {
  const rawStavbaId = req.query.stavbaId;
  const rawCategoryId = req.query.categoryId;
  const stavbaId = rawStavbaId !== undefined ? parseInt(rawStavbaId as string) : undefined;
  const categoryId = rawCategoryId !== undefined ? parseInt(rawCategoryId as string) : undefined;

  const { connections, cats, materials, allItems } = await buildExportData(stavbaId, categoryId);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.registerFont("Regular", FONT_REGULAR);
  doc.registerFont("Bold", FONT_BOLD);

  const catName = cats.length === 1 ? cats[0].name : null;
  const filename = catName ? `${catName}.pdf` : "evidence-pripojek.pdf";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", buildContentDisposition("attachment", filename));
  doc.pipe(res);

  const totalByMaterial = new Map<number, number>();
  for (const item of allItems) {
    totalByMaterial.set(item.materialId, (totalByMaterial.get(item.materialId) ?? 0) + (item.quantity ?? 0));
  }

  const title = catName ? `Evidence materiálu — ${catName}` : "Evidence materiálu přípojek";
  doc.font("Bold").fontSize(16).text(title, { align: "center" });
  doc.moveDown();
  doc.font("Bold").fontSize(14).text("Celkový souhrn");
  doc.moveDown(0.5);

  for (const cat of cats) {
    const catMaterials = materials.filter((m) => m.categoryId === cat.id);
    const catRows = catMaterials.filter((m) => (totalByMaterial.get(m.id) ?? 0) > 0);
    if (catRows.length === 0) continue;
    doc.font("Bold").fontSize(11).fillColor("#444").text(cat.name, { continued: false });
    for (const mat of catRows) {
      const total = totalByMaterial.get(mat.id) ?? 0;
      doc.font("Regular").fontSize(10).fillColor("#000").text(`  ${mat.name}: ${total} ${mat.unit}`);
    }
    doc.moveDown(0.3);
  }

  doc.addPage();
  doc.font("Bold").fontSize(14).fillColor("#000").text("Rozpis přípojek");
  doc.moveDown();

  for (const conn of connections) {
    const connItems = allItems.filter((i) => i.connectionId === conn.id);
    doc.font("Bold").fontSize(12).fillColor("#1a1a1a").text(conn.name);
    if (conn.note) doc.font("Regular").fontSize(9).fillColor("#666").text(conn.note);
    doc.moveDown(0.3);

    let hasItems = false;
    for (const cat of cats) {
      const catMaterials = materials.filter((m) => m.categoryId === cat.id);
      const catRows = catMaterials.filter((m) => {
        const item = connItems.find((i) => i.materialId === m.id);
        return (item?.quantity ?? 0) > 0;
      });
      if (catRows.length === 0) continue;
      hasItems = true;
      doc.font("Bold").fontSize(10).fillColor("#555").text(cat.name);
      for (const mat of catRows) {
        const item = connItems.find((i) => i.materialId === mat.id);
        const qty = item?.quantity ?? 0;
        doc.font("Regular").fontSize(10).fillColor("#000").text(`  ${mat.name}: ${qty} ${mat.unit}`);
      }
    }
    if (!hasItems) {
      doc.font("Regular").fontSize(9).fillColor("#999").text("  Žádné položky");
    }
    doc.moveDown(0.8);
    if (doc.y > 700) doc.addPage();
  }

  doc.end();
});

export default router;
