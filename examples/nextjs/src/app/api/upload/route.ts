import { createRouteHandler } from "@s3-good/core/next";
import { uploadRouter } from "~/server/upload-router";

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
  config: {
    region: process.env.AWS_REGION!,
    bucket: process.env.AWS_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});
