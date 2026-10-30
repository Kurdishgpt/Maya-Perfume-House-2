import express, { type Express } from "express";
import pinoHttp from "pino-http";
import adminRouter from "./routes/admin";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));

// Access checks must remain available even if a catalog integration cannot start.
app.use("/api", adminRouter);
app.use("/api", async (req, res, next) => {
  try {
    const { default: router } = await import("./routes");
    router(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default app;
