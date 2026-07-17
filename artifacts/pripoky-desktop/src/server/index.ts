import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import stavbyRouter from "./routes/stavby";
import categoriesRouter from "./routes/categories";
import materialsRouter from "./routes/materials";
import connectionsRouter from "./routes/connections";
import exportsRouter from "./routes/exports";
import summaryRouter from "./routes/summary";

export function createApp() {
  const app = express();

  app.use(cors({ origin: "*" }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/stavby", stavbyRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/materials", materialsRouter);
  app.use("/api/connections", connectionsRouter);
  app.use("/api/exports", exportsRouter);
  app.use("/api/summary", summaryRouter);

  const rendererDir = process.env.RENDERER_DIR;
  if (rendererDir && fs.existsSync(rendererDir)) {
    app.use(express.static(rendererDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(rendererDir, "index.html"));
    });
  }

  return app;
}
