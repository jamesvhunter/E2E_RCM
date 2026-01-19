/**
 * Stedi Utility Functions
 * Helper functions for working with Stedi API
 */

/**
 * Convert various date formats to Stedi's required YYYYMMDD format
 *
 * Supports:
 * - ISO format: YYYY-MM-DD
 * - US format: MM/DD/YYYY
 * - Numeric: YYYYMMDD, MMDDYYYY
 * - Date objects
 *
 * @param dateInput - Date string or Date object
 * @returns Date string in YYYYMMDD format
 * @throws Error if date cannot be parsed
 */
export function formatDateForStedi(dateInput: string | Date): string {
  // Handle Date objects
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error("Invalid Date object");
    }
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, "0");
    const day = String(dateInput.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  const dateStr = dateInput.trim();

  // Already in YYYYMMDD format (8 digits)
  if (/^\d{8}$/.test(dateStr)) {
    const firstFour = parseInt(dateStr.substring(0, 4));
    // If first 4 digits look like a year (1900-2100), assume YYYYMMDD
    if (firstFour >= 1900 && firstFour <= 2100) {
      return dateStr;
    }
    // Otherwise assume MMDDYYYY and convert
    const month = dateStr.substring(0, 2);
    const day = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    return `${year}${month}${day}`;
  }

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.replace(/-/g, "");
  }

  // US format with slashes: MM/DD/YYYY or M/D/YYYY
  const slashParts = dateStr.split("/");
  if (slashParts.length === 3) {
    const [month, day, year] = slashParts;
    if (year.length === 4) {
      return `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`;
    }
  }

  // US format with dashes: MM-DD-YYYY
  const dashParts = dateStr.split("-");
  if (dashParts.length === 3) {
    // Check if it's YYYY-MM-DD (already handled above) or MM-DD-YYYY
    if (dashParts[0].length === 2 && dashParts[2].length === 4) {
      // MM-DD-YYYY
      const [month, day, year] = dashParts;
      return `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}`;
    }
  }

  // Last resort: try to parse with Date object
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}${month}${day}`;
    }
  } catch {
    // Fall through to error
  }

  throw new Error(
    `Unable to parse date: "${dateStr}". Expected formats: YYYY-MM-DD, MM/DD/YYYY, YYYYMMDD`
  );
}

/**
 * Convert Stedi YYYYMMDD format back to ISO format (YYYY-MM-DD)
 *
 * @param stediDate - Date string in YYYYMMDD format
 * @returns Date string in YYYY-MM-DD format
 */
export function parseStediDate(stediDate: string): string {
  if (!/^\d{8}$/.test(stediDate)) {
    throw new Error(`Invalid Stedi date format: "${stediDate}". Expected YYYYMMDD`);
  }

  const year = stediDate.substring(0, 4);
  const month = stediDate.substring(4, 6);
  const day = stediDate.substring(6, 8);

  return `${year}-${month}-${day}`;
}

/**
 * Generate a unique control number for Stedi transactions
 * Format: PREFIX + 9-digit timestamp
 *
 * @param prefix - Prefix for the control number (e.g., "ELG" for eligibility)
 * @returns Unique control number
 */
export function generateControlNumber(prefix: string = "TXN"): string {
  const timestamp = Date.now().toString().slice(-9);
  return `${prefix}${timestamp}`;
}

/**
 * Validate NPI number using Luhn algorithm (check digit validation)
 *
 * @param npi - NPI number to validate
 * @returns true if NPI is valid, false otherwise
 */
export function validateNPI(npi: string): boolean {
  // NPI must be exactly 10 digits
  if (!/^\d{10}$/.test(npi)) {
    return false;
  }

  // Apply Luhn algorithm with "80840" prefix per CMS specification
  const prefixedNPI = "80840" + npi.substring(0, 9);
  let sum = 0;
  let shouldDouble = true;

  // Process digits from right to left
  for (let i = prefixedNPI.length - 1; i >= 0; i--) {
    let digit = parseInt(prefixedNPI[i]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  // Check digit should make sum divisible by 10
  const checkDigit = parseInt(npi[9]);
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;

  return checkDigit === calculatedCheckDigit;
}

/**
 * Format a member ID by removing common separators and whitespace
 *
 * @param memberId - Raw member ID
 * @returns Cleaned member ID
 */
export function formatMemberId(memberId: string): string {
  // Remove dashes, spaces, and common separators
  return memberId.replace(/[-\s]/g, "").trim().toUpperCase();
}
