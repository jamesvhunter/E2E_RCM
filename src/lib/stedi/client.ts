/**
 * Stedi API Client
 * Handles all EDI transactions via Stedi Healthcare APIs
 */

import { shouldUseMockData, getMockEligibilityResponse } from "./mock-data";

const STEDI_API_BASE = "https://healthcare.us.stedi.com/2024-04-01";

interface StediConfig {
  apiKey: string;
}

class StediClient {
  private apiKey: string;

  constructor(config: StediConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${STEDI_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Key ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Stedi API error: ${response.status} - ${JSON.stringify(error)}`
      );
    }

    return response.json();
  }

  /**
   * Real-time eligibility check (270/271)
   */
  async checkEligibility(request: EligibilityRequest): Promise<EligibilityResponse> {
    // Check if mock mode should be used
    if (shouldUseMockData(this.apiKey, request.tradingPartnerServiceId)) {
      console.log("🧪 Using mock data for eligibility check");
      console.log(`   Member ID: ${request.subscriber.memberId}`);
      console.log(`   Payer ID: ${request.tradingPartnerServiceId}`);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return getMockEligibilityResponse(request.subscriber.memberId);
    }

    // Make real API call
    return this.request<EligibilityResponse>(
      "/change/medicalnetwork/eligibility/v3",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Submit professional claim (837P)
   */
  async submitClaim(claim: Claim837P): Promise<ClaimSubmissionResponse> {
    return this.request<ClaimSubmissionResponse>(
      "/change/medicalnetwork/professionalclaims/v3",
      {
        method: "POST",
        body: JSON.stringify(claim),
      }
    );
  }

  /**
   * Get claim status (276/277)
   */
  async getClaimStatus(
    request: ClaimStatusRequest
  ): Promise<ClaimStatusResponse> {
    return this.request<ClaimStatusResponse>(
      "/change/medicalnetwork/claimstatus/v2",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * List processed transactions (for polling 277CA/835)
   */
  async listTransactions(
    params: TransactionListParams
  ): Promise<TransactionListResponse> {
    const queryParams = new URLSearchParams();
    if (params.afterTransactionId) {
      queryParams.set("afterTransactionId", params.afterTransactionId);
    }
    if (params.transactionType) {
      queryParams.set("transactionType", params.transactionType);
    }
    if (params.limit) {
      queryParams.set("limit", params.limit.toString());
    }

    return this.request<TransactionListResponse>(
      `/transactions?${queryParams.toString()}`
    );
  }

  /**
   * Get transaction details (retrieve 277CA or 835)
   */
  async getTransaction(transactionId: string): Promise<TransactionDetail> {
    return this.request<TransactionDetail>(`/transactions/${transactionId}`);
  }

  /**
   * Get CMS-1500 PDF for a claim (useful for debugging)
   */
  async getCms1500Pdf(transactionId: string): Promise<Blob> {
    const response = await fetch(
      `${STEDI_API_BASE}/export/${transactionId}/1500/pdf`,
      {
        headers: {
          Authorization: `Key ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get CMS-1500 PDF: ${response.status}`);
    }

    return response.blob();
  }
}

// Type definitions for Stedi API

export interface EligibilityRequest {
  controlNumber: string;
  tradingPartnerServiceId: string;
  provider: {
    organizationName?: string;
    firstName?: string;
    lastName?: string;
    npi: string;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  dependents?: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    relationshipCode: string;
  }>;
  encounter?: {
    dateOfService: string;
    serviceTypeCodes?: string[];
  };
}

export interface EligibilityResponse {
  controlNumber: string;
  tradingPartnerServiceId: string;
  provider: {
    organizationName?: string;
    npi: string;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
  };
  planStatus?: Array<{
    statusCode: string;
    status: string;
    planDetails?: string;
  }>;
  benefitsInformation?: Array<{
    code: string;
    name: string;
    coverageLevelCode?: string;
    serviceTypeCodes?: string[];
    benefitAmount?: number;
    benefitPercent?: number;
    inPlanNetworkIndicatorCode?: string;
  }>;
}

export interface Claim837P {
  controlNumber: string;
  tradingPartnerServiceId: string;
  submitter: {
    organizationName: string;
    contactInformation: {
      name: string;
      phoneNumber?: string;
    };
  };
  receiver: {
    organizationName: string;
  };
  billing: {
    organizationName?: string;
    npi: string;
    address: Address;
    taxId?: string;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    address: Address;
    paymentResponsibilityLevelCode: string;
  };
  claimInformation: {
    patientControlNumber: string;
    claimFrequencyCode: string;
    placeOfServiceCode: string;
    claimFilingCode?: string;
    claimChargeAmount: number;
    facilityCodeQualifier?: string;
    serviceFacilityLocation?: {
      organizationName?: string;
      address: Address;
      npi?: string;
    };
    serviceLines: Array<{
      providerControlNumber: string;
      serviceDate: string;
      serviceDateEnd?: string;
      professionalService: {
        procedureCode: string;
        procedureModifiers?: string[];
        lineItemChargeAmount: number;
        measurementUnit: string;
        serviceUnitCount: number;
        diagnosisCodePointers: number[];
      };
    }>;
  };
  rendering?: {
    firstName: string;
    lastName: string;
    npi: string;
  };
  healthCareDiagnosisCodes: Array<{
    diagnosisTypeCode: string;
    diagnosisCode: string;
  }>;
}

export interface ClaimSubmissionResponse {
  controlNumber: string;
  transactionId: string;
  status: string;
  message?: string;
}

export interface ClaimStatusRequest {
  controlNumber: string;
  tradingPartnerServiceId: string;
  provider: {
    organizationName?: string;
    npi: string;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  claimInformation: {
    patientControlNumber: string;
    serviceDate: string;
  };
}

export interface ClaimStatusResponse {
  controlNumber: string;
  claims: Array<{
    patientControlNumber: string;
    statusCategoryCode: string;
    statusCategoryCodeValue: string;
    statusCode: string;
    statusCodeValue: string;
    effectiveDate?: string;
  }>;
}

export interface TransactionListParams {
  afterTransactionId?: string;
  transactionType?: "277CA" | "835" | "271";
  limit?: number;
}

export interface TransactionListResponse {
  transactions: Array<{
    transactionId: string;
    transactionType: string;
    createdAt: string;
    status: string;
  }>;
  nextPageToken?: string;
}

export interface TransactionDetail {
  transactionId: string;
  transactionType: string;
  status: string;
  createdAt: string;
  data: Record<string, unknown>;
}

interface Address {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
}

// Export singleton client
let stediClient: StediClient | null = null;

export function getStediClient(): StediClient {
  if (!stediClient) {
    const apiKey = process.env.STEDI_API_KEY;
    if (!apiKey) {
      throw new Error("STEDI_API_KEY environment variable is not set");
    }
    stediClient = new StediClient({ apiKey });
  }
  return stediClient;
}

export { StediClient };
