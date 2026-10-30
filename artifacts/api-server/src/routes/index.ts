import rawMaterialsRouter from "./rawMaterials";
router.use(rawMaterialsRouter);
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import productsRouter from "./products";
import fragranceRouter from "./fragrance";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(productsRouter);
router.use(fragranceRouter);
router.use(storageRouter);

export default router;
