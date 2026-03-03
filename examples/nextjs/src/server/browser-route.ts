import { createBrowser } from "s3-good/server";

export const browserRoute = createBrowser()
  .rootPrefix(process.env.AWS_BROWSER_ROOT_PREFIX ?? "")
  .pageSize(100);
