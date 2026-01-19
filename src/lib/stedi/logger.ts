/**
 * Stedi API Logger
 * Structured logging for Stedi API interactions
 */

interface LogContext {
  controlNumber?: string;
  payerId?: string;
  memberId?: string;
  npi?: string;
  [key: string]: any;
}

/**
 * Log Stedi eligibility request
 */
export function logEligibilityRequest(
  request: any,
  context?: LogContext
) {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (!isDevelopment) {
    // Production: minimal JSON logging
    console.log(
      JSON.stringify({
        type: "stedi_eligibility_request",
        controlNumber: request.controlNumber,
        payerId: request.tradingPartnerServiceId,
        memberId: request.subscriber?.memberId?.substring(0, 4) + "****", // Mask for privacy
        npi: request.provider?.npi,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
    return;
  }

  // Development: formatted console logging
  console.log("\n" + "=".repeat(70));
  console.log("📤 STEDI ELIGIBILITY REQUEST");
  console.log("=".repeat(70));
  console.log(`Control Number: ${request.controlNumber}`);
  console.log(`Payer ID:       ${request.tradingPartnerServiceId}`);
  console.log(`Provider NPI:   ${request.provider?.npi}`);
  console.log(`Member ID:      ${request.subscriber?.memberId}`);
  console.log(`Subscriber:     ${request.subscriber?.firstName} ${request.subscriber?.lastName}`);
  console.log(`Date of Birth:  ${request.subscriber?.dateOfBirth}`);
  console.log(`Service Date:   ${request.encounter?.dateOfService}`);
  console.log(`Service Types:  ${request.encounter?.serviceTypeCodes?.join(", ") || "default (30)"}`);
  console.log("-".repeat(70));
  console.log("Full Request Body:");
  console.log(JSON.stringify(request, null, 2));
  console.log("=".repeat(70) + "\n");
}

/**
 * Log Stedi eligibility response
 */
export function logEligibilityResponse(
  response: any,
  context?: LogContext
) {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (!isDevelopment) {
    // Production: minimal JSON logging
    const planStatus = response.planStatus?.[0];
    console.log(
      JSON.stringify({
        type: "stedi_eligibility_response",
        controlNumber: response.controlNumber,
        statusCode: planStatus?.statusCode,
        status: planStatus?.status,
        benefitsCount: response.benefitsInformation?.length || 0,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
    return;
  }

  // Development: formatted console logging
  console.log("\n" + "=".repeat(70));
  console.log("📥 STEDI ELIGIBILITY RESPONSE");
  console.log("=".repeat(70));
  console.log(`Control Number: ${response.controlNumber}`);

  if (response.planStatus && response.planStatus.length > 0) {
    const status = response.planStatus[0];
    console.log(`Plan Status:    [${status.statusCode}] ${status.status}`);
  }

  if (response.planInformation) {
    console.log(`Plan Name:      ${response.planInformation.planName || "N/A"}`);
    console.log(`Group Number:   ${response.planInformation.groupNumber || "N/A"}`);
  }

  if (response.benefitsInformation) {
    console.log(`Benefits Found: ${response.benefitsInformation.length}`);
  }

  if (response.errors && response.errors.length > 0) {
    console.log("\n⚠️  ERRORS:");
    response.errors.forEach((err: any, i: number) => {
      console.log(`  ${i + 1}. [${err.code}] ${err.description}`);
      if (err.possibleResolutions) {
        console.log(`     → ${err.possibleResolutions.join("; ")}`);
      }
    });
  }

  console.log("-".repeat(70));
  console.log("Full Response:");
  console.log(JSON.stringify(response, null, 2));
  console.log("=".repeat(70) + "\n");
}

/**
 * Log Stedi API error
 */
export function logEligibilityError(
  error: Error,
  request?: any,
  context?: LogContext
) {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (!isDevelopment) {
    // Production: minimal JSON logging
    console.error(
      JSON.stringify({
        type: "stedi_eligibility_error",
        error: error.message,
        controlNumber: request?.controlNumber,
        payerId: request?.tradingPartnerServiceId,
        timestamp: new Date().toISOString(),
        ...context,
      })
    );
    return;
  }

  // Development: formatted console logging
  console.error("\n" + "=".repeat(70));
  console.error("❌ STEDI ELIGIBILITY ERROR");
  console.error("=".repeat(70));
  console.error(`Error: ${error.message}`);
  if (request) {
    console.error(`Control Number: ${request.controlNumber}`);
    console.error(`Payer ID: ${request.tradingPartnerServiceId}`);
    console.error(`Member ID: ${request.subscriber?.memberId}`);
  }
  console.error("-".repeat(70));
  console.error("Stack Trace:");
  console.error(error.stack);
  console.error("=".repeat(70) + "\n");
}
