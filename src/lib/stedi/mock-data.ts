/**
 * Stedi Mock Data
 * Test data for development and testing without real API calls
 * Based on Stedi's documented mock responses
 */

import { EligibilityResponse } from "./client";

/**
 * Mock active medical coverage eligibility response
 * Simulates a subscriber with active coverage and comprehensive benefits
 */
export const MOCK_ACTIVE_ELIGIBILITY: EligibilityResponse = {
  controlNumber: "TEST123456789",
  tradingPartnerServiceId: "STEDI-TEST",
  provider: {
    organizationName: "Test Medical Practice",
    npi: "1234567893",
  },
  subscriber: {
    memberId: "TEST123456",
    firstName: "John",
    lastName: "Doe",
    dateOfBirth: "19800115",
  },
  planStatus: [
    {
      statusCode: "1",
      status: "Active Coverage",
      planDetails: "Active medical coverage",
    },
  ],
  planInformation: {
    planName: "Gold PPO Plan",
    groupNumber: "GRP-123456",
  },
  planDateInformation: {
    eligibilityBegin: "20240101",
    eligibilityEnd: "20241231",
  },
  benefitsInformation: [
    {
      code: "B",
      name: "Co-Payment",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 25,
    },
    {
      code: "C",
      name: "Deductible",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 1500,
    },
    {
      code: "C",
      name: "Deductible",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      timeQualifierCode: "29",
      benefitAmount: 800,
    },
    {
      code: "A",
      name: "Co-Insurance",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitPercent: 0.2, // 20%
    },
    {
      code: "G",
      name: "Out of Pocket (Stop Loss)",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 5000,
    },
    {
      code: "G",
      name: "Out of Pocket (Stop Loss)",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      timeQualifierCode: "29",
      benefitAmount: 3500,
    },
  ],
};

/**
 * Mock inactive coverage eligibility response
 * Simulates a subscriber with terminated coverage
 */
export const MOCK_INACTIVE_ELIGIBILITY: EligibilityResponse = {
  controlNumber: "TEST123456789",
  tradingPartnerServiceId: "STEDI-TEST",
  provider: {
    organizationName: "Test Medical Practice",
    npi: "1234567893",
  },
  subscriber: {
    memberId: "INACTIVE123",
    firstName: "Jane",
    lastName: "Smith",
    dateOfBirth: "19900615",
  },
  planStatus: [
    {
      statusCode: "6",
      status: "Inactive",
      planDetails: "Coverage terminated",
    },
  ],
  planInformation: {
    planName: "Silver PPO Plan",
    groupNumber: "GRP-789012",
  },
  planDateInformation: {
    eligibilityBegin: "20230101",
    eligibilityEnd: "20231231",
  },
  benefitsInformation: [],
};

/**
 * Mock error response - Invalid subscriber
 * Simulates AAA error code 72 (Invalid/Missing Subscriber Identification Number)
 */
export const MOCK_ERROR_INVALID_SUBSCRIBER: EligibilityResponse = {
  controlNumber: "TEST123456789",
  tradingPartnerServiceId: "STEDI-TEST",
  provider: {
    organizationName: "Test Medical Practice",
    npi: "1234567893",
  },
  subscriber: {
    memberId: "INVALID",
    firstName: "Test",
    lastName: "Error",
  },
  planStatus: [],
  benefitsInformation: [],
  errors: [
    {
      code: "72",
      description: "Invalid/Missing Subscriber Identification Number",
      followupAction: "Please verify the member ID and try again",
      possibleResolutions: [
        "Check that the member ID matches the insurance card exactly",
        "Verify the patient's date of birth and name spelling",
      ],
    },
  ],
};

/**
 * Mock family coverage eligibility response
 * Simulates family-level benefits with different individual vs family amounts
 */
export const MOCK_FAMILY_COVERAGE: EligibilityResponse = {
  controlNumber: "TEST123456789",
  tradingPartnerServiceId: "STEDI-TEST",
  provider: {
    organizationName: "Test Medical Practice",
    npi: "1234567893",
  },
  subscriber: {
    memberId: "FAM123456",
    firstName: "Robert",
    lastName: "Johnson",
    dateOfBirth: "19750520",
  },
  planStatus: [
    {
      statusCode: "1",
      status: "Active Coverage",
    },
  ],
  planInformation: {
    planName: "Platinum Family Plan",
    groupNumber: "GRP-FAM001",
  },
  planDateInformation: {
    eligibilityBegin: "20240101",
    eligibilityEnd: "20241231",
  },
  benefitsInformation: [
    // Individual benefits
    {
      code: "C",
      name: "Deductible",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 1000,
    },
    {
      code: "C",
      name: "Deductible",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      timeQualifierCode: "29",
      benefitAmount: 600,
    },
    // Family benefits
    {
      code: "C",
      name: "Deductible",
      coverageLevelCode: "FAM",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 3000,
    },
    {
      code: "G",
      name: "Out of Pocket (Stop Loss)",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 5000,
    },
    {
      code: "G",
      name: "Out of Pocket (Stop Loss)",
      coverageLevelCode: "FAM",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 10000,
    },
  ],
};

/**
 * Mock high-deductible health plan (HDHP) eligibility response
 * Simulates an HDHP with HSA eligibility
 */
export const MOCK_HDHP_ELIGIBILITY: EligibilityResponse = {
  controlNumber: "TEST123456789",
  tradingPartnerServiceId: "STEDI-TEST",
  provider: {
    organizationName: "Test Medical Practice",
    npi: "1234567893",
  },
  subscriber: {
    memberId: "HDHP123456",
    firstName: "Michael",
    lastName: "Williams",
    dateOfBirth: "19851010",
  },
  planStatus: [
    {
      statusCode: "1",
      status: "Active Coverage",
    },
  ],
  planInformation: {
    planName: "Bronze HDHP with HSA",
    groupNumber: "GRP-HDHP100",
  },
  planDateInformation: {
    eligibilityBegin: "20240101",
    eligibilityEnd: "20241231",
  },
  benefitsInformation: [
    {
      code: "C",
      name: "Deductible",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 6000,
    },
    {
      code: "C",
      name: "Deductible",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      timeQualifierCode: "29",
      benefitAmount: 5200,
    },
    {
      code: "A",
      name: "Co-Insurance",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitPercent: 0, // 0% after deductible
    },
    {
      code: "G",
      name: "Out of Pocket (Stop Loss)",
      coverageLevelCode: "IND",
      inPlanNetworkIndicatorCode: "Y",
      serviceTypeCodes: ["30"],
      benefitAmount: 7000,
    },
  ],
};

/**
 * Get mock eligibility response based on member ID pattern
 * This simulates Stedi's test mode behavior
 *
 * @param memberId - The member ID from the request
 * @returns Mock eligibility response
 */
export function getMockEligibilityResponse(memberId: string): EligibilityResponse {
  const normalizedId = memberId.toUpperCase().trim();

  // Match based on member ID patterns
  if (normalizedId.includes("INACTIVE")) {
    return MOCK_INACTIVE_ELIGIBILITY;
  }

  if (normalizedId.includes("INVALID") || normalizedId.includes("ERROR")) {
    return MOCK_ERROR_INVALID_SUBSCRIBER;
  }

  if (normalizedId.includes("FAM")) {
    return MOCK_FAMILY_COVERAGE;
  }

  if (normalizedId.includes("HDHP") || normalizedId.includes("HSA")) {
    return MOCK_HDHP_ELIGIBILITY;
  }

  // Default: return active coverage
  return MOCK_ACTIVE_ELIGIBILITY;
}

/**
 * Check if mock mode should be enabled based on environment and payer ID
 *
 * @param apiKey - Stedi API key
 * @param payerId - Trading partner service ID
 * @returns true if mock mode should be used
 */
export function shouldUseMockData(apiKey: string | undefined, payerId: string): boolean {
  // Use mock if API key is missing
  if (!apiKey) {
    return true;
  }

  // Use mock if API key is placeholder
  if (apiKey === "your-stedi-api-key") {
    return true;
  }

  // Allow real API calls for valid test keys starting with "test_"
  if (apiKey.startsWith("test_")) {
    return false;
  }

  // Use mock only for explicit test payer ID
  if (payerId === "STEDI-TEST") {
    return true;
  }

  return false;
}
