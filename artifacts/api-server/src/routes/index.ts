import { Router, type IRouter } from "express";
import healthRouter from "./health";
import stavbyRouter from "./stavby";
import categoriesRouter from "./categories";
import materialsRouter from "./materials";
import connectionsRouter from "./connections";
import summaryRouter from "./summary";
import exportsRouter from "./exports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/stavby", stavbyRouter);
router.use("/categories", categoriesRouter);
router.use("/materials", materialsRouter);
router.use("/connections", connectionsRouter);
router.use("/summary", summaryRouter);
router.use("/export", exportsRouter);

export default router;
