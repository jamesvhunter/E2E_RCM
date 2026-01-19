import { Inngest } from "inngest";

// Create an Inngest client for ClaimFlow
export const inngest = new Inngest({
  id: "claimflow",
});

// Event types for type safety
export type ClaimSubmittedEvent = {
  name: "claim/submitted";
  data: {
    claimId: string;
    patientControlNumber: string;
    encounterId: string;
  };
};

export type StediTransactionReceivedEvent = {
  name: "stedi/transaction.received";
  data: {
    transactionId: string;
    transactionType: "277CA" | "835" | "271";
    patientControlNumber?: string;
  };
};

export type EligibilityCheckRequestedEvent = {
  name: "eligibility/check.requested";
  data: {
    eligibilityCheckId: string;
    coverageId: string;
    providerId: string;
    dateOfService: string;
  };
};

export type ChargeSetCreatedEvent = {
  name: "charge-set/created";
  data: {
    chargeSetId: string;
    encounterId: string;
    requiresReview: boolean;
  };
};

// Union of all events
export type ClaimFlowEvents =
  | ClaimSubmittedEvent
  | StediTransactionReceivedEvent
  | EligibilityCheckRequestedEvent
  | ChargeSetCreatedEvent;
