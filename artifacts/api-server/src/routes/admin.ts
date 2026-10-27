import { Router, type IRouter } from "express";
import { GetAdminAccessResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

router.get("/admin/access", requireAdmin, (_req, res): void => {
  res.json(GetAdminAccessResponse.parse({ allowed: true }));
});

export default router;
