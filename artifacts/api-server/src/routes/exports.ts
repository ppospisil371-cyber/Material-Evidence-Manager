import { Router } from "express";
import { db } from "@workspace/db";
import { connectionsTable, connectionItemsTable, materialsTable, categoriesTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

const router = Router();

async function buildExportData() {
  const connections = await db.select().from(connectionsTable).orderBy(asc(connectionsTable.name));
  const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.order));
  const materials = await db.select().from(materialsTable).orderBy(asc(materialsTable.order));
  const allItems = await db.select().from(connectionItemsTable);

  const catMap = new Map(cats.map((c) => [c.id, c]));
  const matMap = new Map(materials.map((m) => [m.id, m]));

  return { connections, cats, materials, allItems, catMap, matMap };
}

router.get("/xls", async (_req, res) => {
  const { connections, cats, materials, allItems, catMap, matMap } = await buildExportData();

  const wb = XLSX.utils.book_new();

  // Summary sheet
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

  // Per-connection sheets
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

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=evidence-pripojek.xlsx");
  res.send(buf);
});

router.get("/pdf", async (_req, res) => {
  const { connections, cats, materials, allItems } = await buildExportData();

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=evidence-pripojek.pdf");
  doc.pipe(res);

  const totalByMaterial = new Map<number, number>();
  for (const item of allItems) {
    totalByMaterial.set(item.materialId, (totalByMaterial.get(item.materialId) ?? 0) + (item.quantity ?? 0));
  }

  doc.fontSize(16).text("Evidence materiálu přípojek", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text("Celkový souhrn", { underline: true });
  doc.moveDown(0.5);

  for (const cat of cats) {
    const catMaterials = materials.filter((m) => m.categoryId === cat.id);
    const catRows = catMaterials.filter((m) => (totalByMaterial.get(m.id) ?? 0) > 0);
    if (catRows.length === 0) continue;
    doc.fontSize(11).fillColor("#444").text(cat.name, { continued: false });
    for (const mat of catRows) {
      const total = totalByMaterial.get(mat.id) ?? 0;
      doc.fontSize(10).fillColor("#000").text(`  ${mat.name}: ${total} ${mat.unit}`);
    }
    doc.moveDown(0.3);
  }

  doc.addPage();
  doc.fontSize(14).text("Rozpis přípojek", { underline: true });
  doc.moveDown();

  for (const conn of connections) {
    const connItems = allItems.filter((i) => i.connectionId === conn.id);
    doc.fontSize(12).fillColor("#1a1a1a").text(conn.name, { underline: false });
    if (conn.note) doc.fontSize(9).fillColor("#666").text(conn.note);
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
      doc.fontSize(10).fillColor("#555").text(cat.name);
      for (const mat of catRows) {
        const item = connItems.find((i) => i.materialId === mat.id);
        const qty = item?.quantity ?? 0;
        doc.fontSize(10).fillColor("#000").text(`  ${mat.name}: ${qty} ${mat.unit}`);
      }
    }
    if (!hasItems) {
      doc.fontSize(9).fillColor("#999").text("  Žádné položky");
    }
    doc.moveDown(0.8);

    if (doc.y > 700) doc.addPage();
  }

  doc.end();
});

export default router;
