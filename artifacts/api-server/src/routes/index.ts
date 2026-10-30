import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import productsRouter from "./products";
import fragranceRouter from "./fragrance";
import storageRouter from "./storage";
import rawMaterialsRouter from "./rawMaterials";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(productsRouter);
router.use(fragranceRouter);
router.use(storageRouter);
router.use(rawMaterialsRouter);

export default router;
