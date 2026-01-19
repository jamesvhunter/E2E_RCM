/**
 * Tests for Stedi utility functions
 */

import { describe, it, expect } from "vitest";
import {
  formatDateForStedi,
  parseStediDate,
  generateControlNumber,
  validateNPI,
  formatMemberId,
} from "./utils";

describe("formatDateForStedi", () => {
  it("converts ISO format YYYY-MM-DD to YYYYMMDD", () => {
    expect(formatDateForStedi("1980-01-15")).toBe("19800115");
    expect(formatDateForStedi("2024-12-31")).toBe("20241231");
  });

  it("converts US format MM/DD/YYYY to YYYYMMDD", () => {
    expect(formatDateForStedi("01/15/1980")).toBe("19800115");
    expect(formatDateForStedi("12/31/2024")).toBe("20241231");
    expect(formatDateForStedi("1/5/2024")).toBe("20240105");
  });

  it("handles YYYYMMDD format (no conversion needed)", () => {
    expect(formatDateForStedi("19800115")).toBe("19800115");
    expect(formatDateForStedi("20241231")).toBe("20241231");
  });

  it("converts MMDDYYYY to YYYYMMDD", () => {
    expect(formatDateForStedi("01151980")).toBe("19800115");
    expect(formatDateForStedi("12312024")).toBe("20241231");
  });

  it("converts MM-DD-YYYY to YYYYMMDD", () => {
    expect(formatDateForStedi("01-15-1980")).toBe("19800115");
    expect(formatDateForStedi("12-31-2024")).toBe("20241231");
  });

  it("converts Date objects to YYYYMMDD", () => {
    const date = new Date("1980-01-15");
    expect(formatDateForStedi(date)).toBe("19800115");
  });

  it("throws error for invalid dates", () => {
    expect(() => formatDateForStedi("invalid")).toThrow();
    expect(() => formatDateForStedi("")).toThrow();
    expect(() => formatDateForStedi(new Date("invalid"))).toThrow();
  });
});

describe("parseStediDate", () => {
  it("converts YYYYMMDD to YYYY-MM-DD", () => {
    expect(parseStediDate("19800115")).toBe("1980-01-15");
    expect(parseStediDate("20241231")).toBe("2024-12-31");
  });

  it("throws error for invalid format", () => {
    expect(() => parseStediDate("1980-01-15")).toThrow();
    expect(() => parseStediDate("198001")).toThrow();
    expect(() => parseStediDate("invalid")).toThrow();
  });
});

describe("generateControlNumber", () => {
  it("generates control number with default prefix", () => {
    const controlNumber = generateControlNumber();
    expect(controlNumber).toMatch(/^TXN\d{9}$/);
  });

  it("generates control number with custom prefix", () => {
    const controlNumber = generateControlNumber("ELG");
    expect(controlNumber).toMatch(/^ELG\d{9}$/);
  });

  it("generates unique control numbers", () => {
    const cn1 = generateControlNumber();
    const cn2 = generateControlNumber();
    expect(cn1).not.toBe(cn2);
  });
});

describe("validateNPI", () => {
  it("validates correct NPIs", () => {
    // Real NPIs that pass Luhn check
    expect(validateNPI("1234567893")).toBe(true);
    expect(validateNPI("1234567893")).toBe(true);
  });

  it("rejects invalid NPIs", () => {
    expect(validateNPI("1234567890")).toBe(false); // Wrong check digit
    expect(validateNPI("123456789")).toBe(false); // Too short
    expect(validateNPI("12345678901")).toBe(false); // Too long
    expect(validateNPI("123456789a")).toBe(false); // Non-numeric
    expect(validateNPI("")).toBe(false); // Empty
  });
});

describe("formatMemberId", () => {
  it("removes dashes and spaces", () => {
    expect(formatMemberId("ABC-123-456")).toBe("ABC123456");
    expect(formatMemberId("ABC 123 456")).toBe("ABC123456");
    expect(formatMemberId("ABC - 123 - 456")).toBe("ABC123456");
  });

  it("converts to uppercase", () => {
    expect(formatMemberId("abc123")).toBe("ABC123");
  });

  it("handles already clean IDs", () => {
    expect(formatMemberId("ABC123456")).toBe("ABC123456");
  });
});
