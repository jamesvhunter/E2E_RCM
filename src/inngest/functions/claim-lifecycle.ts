import { inngest } from "../client";

/**
 * Claim lifecycle state machine
 * Handles the progression of claims from submission to adjudication
 */
export const claimLifecycle = inngest.createFunction(
  {
    id: "claim-lifecycle",
    retries: 3,
  },
  { event: "claim/submitted" },
  async ({ event, step }) => {
    const { claimId, patientControlNumber } = event.data;

    // Step 1: Submit claim to Stedi
    const submission = await step.run("submit-to-stedi", async () => {
      // TODO: Implement Stedi 837P submission
      // const result = await stediClient.submitClaim(claimId);
      // return result;
      
      console.log(`Submitting claim ${claimId} to Stedi...`);
      return {
        success: true,
        stediTransactionId: `txn_${Date.now()}`,
        stediCorrelationId: `corr_${Date.now()}`,
      };
    });

    if (!submission.success) {
      // Create work item for failed submission
      await step.run("create-submission-failure-workitem", async () => {
        // TODO: Create work item
        console.log(`Creating work item for failed submission of claim ${claimId}`);
      });
      return { status: "failed", reason: "submission_failed" };
    }

    // Step 2: Update claim with Stedi transaction IDs
    await step.run("update-claim-submitted", async () => {
      // TODO: Update claim in database
      console.log(`Updating claim ${claimId} with Stedi transaction ID`);
    });

    // Step 3: Wait for 277CA acknowledgment (with timeout)
    const acknowledgment = await step.waitForEvent("wait-for-277ca", {
      event: "stedi/transaction.received",
      match: "data.patientControlNumber",
      timeout: "7d",
    });

    if (!acknowledgment) {
      // Timeout - check claim status manually
      await step.run("check-claim-status", async () => {
        // TODO: Implement Stedi 276/277 status check
        console.log(`Checking status for claim ${claimId}`);
      });
      return { status: "timeout", reason: "no_277ca_received" };
    }

    // Step 4: Process acknowledgment
    if (acknowledgment.data.transactionType === "277CA") {
      await step.run("process-277ca", async () => {
        // TODO: Process 277CA and update claim status
        console.log(`Processing 277CA for claim ${claimId}`);
      });
    }

    // Step 5: Wait for 835 remittance (with timeout)
    const remittance = await step.waitForEvent("wait-for-835", {
      event: "stedi/transaction.received",
      match: "data.patientControlNumber",
      timeout: "90d",
    });

    if (!remittance) {
      await step.run("create-missing-remit-workitem", async () => {
        console.log(`Creating work item for missing 835 for claim ${claimId}`);
      });
      return { status: "pending", reason: "awaiting_835" };
    }

    // Step 6: Process remittance and post to ledger
    await step.run("process-835", async () => {
      // TODO: Process 835 and post to ledger
      console.log(`Processing 835 for claim ${claimId}`);
    });

    return {
      status: "adjudicated",
      claimId,
      patientControlNumber,
    };
  }
);

/**
 * ERA (835) auto-posting function
 * Processes Electronic Remittance Advice and posts to ledger
 */
export const eraAutoPosting = inngest.createFunction(
  {
    id: "era-auto-posting",
    retries: 3,
  },
  { event: "stedi/transaction.received" },
  async ({ event, step }) => {
    if (event.data.transactionType !== "835") {
      return { skipped: true, reason: "not_835" };
    }

    const { transactionId, patientControlNumber } = event.data;

    // Step 1: Retrieve 835 from Stedi
    const eraData = await step.run("retrieve-835", async () => {
      // TODO: Implement Stedi 835 retrieval
      console.log(`Retrieving 835 transaction ${transactionId}`);
      return {
        payments: [],
        adjustments: [],
        patientResponsibility: 0,
      };
    });

    // Step 2: Match to claim
    const claim = await step.run("match-to-claim", async () => {
      // TODO: Find claim by patient control number
      console.log(`Matching 835 to claim ${patientControlNumber}`);
      return { claimId: "matched-claim-id" };
    });

    // Step 3: Post payments to ledger
    await step.run("post-payments", async () => {
      // TODO: Post insurance payments to ledger
      console.log(`Posting payments for claim ${claim.claimId}`);
    });

    // Step 4: Post adjustments to ledger
    await step.run("post-adjustments", async () => {
      // TODO: Post adjustments with CARC/RARC codes
      console.log(`Posting adjustments for claim ${claim.claimId}`);
    });

    // Step 5: Update claim status
    await step.run("update-claim-adjudicated", async () => {
      // TODO: Update claim status to adjudicated
      console.log(`Updating claim ${claim.claimId} to adjudicated`);
    });

    // Step 6: Create work items for denials if needed
    if (eraData.patientResponsibility > 0) {
      await step.run("handle-patient-responsibility", async () => {
        // Could trigger statement generation
        console.log(`Patient responsibility: ${eraData.patientResponsibility}`);
      });
    }

    return {
      status: "posted",
      transactionId,
      claimId: claim.claimId,
    };
  }
);
