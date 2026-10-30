import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { Router, raw, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();
const maxImageBytes = 4 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const contentTypes: Record<string, string> = Object.fromEntries(Object.entries(extensions).map(([type, ext]) => [ext, type]));
const validKey = /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/;
function imageMatches(bytes: Buffer, extension: string): boolean {
  if (extension === "jpg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (extension === "webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return bytes.toString("ascii", 4, 8) === "ftyp" && /avif|avis/.test(bytes.toString("ascii", 8, 32));
}
router.post("/storage/uploads/request-url", requireAdmin, (req, res): void => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success || parsed.data.size < 1 || parsed.data.size > maxImageBytes || !extensions[parsed.data.contentType]) {
    res.status(400).json({ error: "Use a JPEG, PNG, WebP, or AVIF image up to 4 MB." }); return;
  }
  const { name, size, contentType } = parsed.data;
  const key = `uploads/${randomUUID()}.${extensions[contentType]}`;
  res.json(RequestUploadUrlResponse.parse({
    uploadURL: `/api/storage/${key}`, objectPath: key,
    publicUrl: `/api/storage/objects/${key}`, metadata: { name, size, contentType },
  }));
});
router.put("/storage/uploads/:filename", requireAdmin, raw({ type: Object.keys(extensions), limit: maxImageBytes }), async (req, res): Promise<void> => {
  const key = `uploads/${req.params.filename}`;
  const extension = key.split(".").pop()!;
  if (!validKey.test(key) || !Buffer.isBuffer(req.body) || !req.body.length || req.body.length > maxImageBytes || req.get("Content-Type") !== contentTypes[extension] || !imageMatches(req.body, extension)) {
    res.status(400).json({ error: "Choose a valid JPEG, PNG, WebP, or AVIF image up to 4 MB." }); return;
  }
  try {
    await getStore("maya-product-images").set(key, new Uint8Array(req.body).buffer);
    res.sendStatus(204);
  } catch {
    req.log.error("Product image upload failed");
    res.status(503).json({ error: "The image could not be saved. Please try again." });
  }
});
router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  const rawPath = req.params.path;
  const key = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
  if (!validKey.test(key)) { res.status(404).json({ error: "Image not found." }); return; }
  try {
    // An image is shown immediately after upload, so this read needs strong consistency.
    const image = await getStore({ name: "maya-product-images", consistency: "strong" }).get(key, { type: "arrayBuffer" });
    if (!image) { res.status(404).json({ error: "Image not found." }); return; }
    res.setHeader("Content-Type", contentTypes[key.split(".").pop()!]);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(Buffer.from(image));
  } catch {
    req.log.error("Product image delivery failed");
    res.status(503).json({ error: "The image could not be loaded." });
  }
});
export default router;
