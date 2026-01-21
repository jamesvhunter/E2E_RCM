import { createTRPCRouter } from "@/lib/trpc/server";
import { patientRouter } from "./patient";
import { coverageRouter } from "./coverage";
import { encounterRouter } from "./encounter";
import { claimRouter } from "./claim";
import { ledgerRouter } from "./ledger";
import { eligibilityRouter } from "./eligibility";
import { practiceRouter } from "./practice";
import { workQueueRouter } from "./work-queue";
import { intakeRouter } from "./intake";
import { appointmentRouter } from "./appointment";

/**
 * Main application router
 * All routers are combined here
 */
export const appRouter = createTRPCRouter({
  patient: patientRouter,
  coverage: coverageRouter,
  encounter: encounterRouter,
  claim: claimRouter,
  ledger: ledgerRouter,
  eligibility: eligibilityRouter,
  practice: practiceRouter,
  workQueue: workQueueRouter,
  intake: intakeRouter,
  appointment: appointmentRouter,
});

export type AppRouter = typeof appRouter;
