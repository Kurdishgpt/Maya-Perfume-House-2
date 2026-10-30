import serverless from "serverless-http";
import app from "./app";
import { connectLambda } from "@netlify/blobs";

// Netlify rewrites /api/* to this function. basePath removes the function
// routing prefix so Express receives the same /api/... path used on Replit.
const apiHandler = serverless(app, {
  basePath: "/.netlify/functions/api",
  binary: ["image/*"],
});

export const handler: typeof apiHandler = async (event, context) => {
  connectLambda(event as Parameters<typeof connectLambda>[0]);
  return apiHandler(event, context);
};
