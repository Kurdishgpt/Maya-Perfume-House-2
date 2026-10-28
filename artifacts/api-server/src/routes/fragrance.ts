import {
  AutofillFragranceBody,
  AutofillFragranceResponse,
} from "@workspace/api-zod";
import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();
const requestCounts = new Map<string, { startedAt: number; count: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;
const placeholderImage = "/images/hero-fragrance.png";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

function takeRateLimitToken(clientIp: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(clientIp);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestCounts.set(clientIp, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

router.post(
  "/autofill-fragrance",
  requireAdmin,
  async (req, res): Promise<void> => {
    const parsed = AutofillFragranceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter a fragrance name to continue." });
      return;
    }

    if (!takeRateLimitToken(req.ip || "unknown")) {
      res.status(429).json({ error: "Please wait before requesting more suggestions." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "Fragrance autofill is not configured." });
      return;
    }

    const prompt = `Create an editable product draft for the fragrance named: "${parsed.data.query.trim()}". Return only valid JSON with exactly these fields: title (string), brand (string), price (number in USD), category (short fragrance family), description (a polished detailed description that includes the scent story), top_notes (array of short note names), heart_notes (array), base_notes (array), ingredients (array of cosmetic INCI names), image_url (string). Use product knowledge when confident, but do not claim ingredients are verified or invent exact label copy; ingredients are suggestions that the merchant must check against the packaging. Keep the product name and brand accurate. Suggested price should be a plausible retail USD price. Set image_url to "${placeholderImage}". No markdown or extra fields.`;

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );

      if (!response.ok) {
        req.log.warn(
          { statusCode: response.status },
          "Gemini fragrance suggestion request failed",
        );
        if (response.status === 429) {
          res.status(429).json({ error: "The AI service is busy. Try again shortly." });
          return;
        }
        res.status(502).json({ error: "The AI service could not create a suggestion." });
        return;
      }

      const result = (await response.json()) as GeminiResponse;
      const text = result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();
      if (!text) {
        res.status(502).json({ error: "The AI service returned an empty suggestion." });
        return;
      }

      const suggestion = JSON.parse(text) as Record<string, unknown>;
      const validated = AutofillFragranceResponse.safeParse({
        ...suggestion,
        image_url: placeholderImage,
      });
      if (!validated.success) {
        req.log.warn(
          { validationError: validated.error.message },
          "Gemini returned an invalid fragrance suggestion",
        );
        res.status(502).json({ error: "The AI response was incomplete. Try again." });
        return;
      }

      res.json(validated.data);
    } catch (error) {
      req.log.error({ err: error }, "Fragrance autofill failed");
      res.status(502).json({ error: "The AI service could not create a suggestion." });
    }
  },
);

export default router;
