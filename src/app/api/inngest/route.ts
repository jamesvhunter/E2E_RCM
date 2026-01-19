import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { claimLifecycle, eraAutoPosting } from "@/inngest/functions/claim-lifecycle";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    claimLifecycle,
    eraAutoPosting,
  ],
});
