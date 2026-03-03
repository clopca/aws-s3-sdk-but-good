import { createBrowserRouteHandler } from "s3-good/next";
import { browserRoute } from "~/server/browser-route";

export const { GET, POST } = createBrowserRouteHandler({
  browser: browserRoute,
  config: {
    region: process.env.AWS_REGION!,
    bucket: process.env.AWS_BUCKET!,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});
