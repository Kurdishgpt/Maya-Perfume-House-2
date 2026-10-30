import serverless from "serverless-http";
import app from "./app";

// Netlify rewrites /api/* to this function. basePath removes the function
// routing prefix so Express receives the same /api/... path used on Replit.
export const handler = serverless(app, {
  basePath: "/.netlify/functions/api",
  binary: ["image/*"],
});
