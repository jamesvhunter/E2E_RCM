/**
 * Email Configuration
 * Centralized email settings for Resend
 */

export const emailConfig = {
  /**
   * FROM email address
   * - For testing: Use onboarding@resend.dev (can only send to your verified account email)
   * - For production: Use your verified domain (e.g., intake@yourdomain.com)
   */
  fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",

  /**
   * FROM name displayed to recipients
   */
  fromName: process.env.RESEND_FROM_NAME || "ClaimFlow Medical",

  /**
   * Test email addresses (for development)
   * These special Resend addresses simulate different scenarios:
   * - delivered@resend.dev: Simulates successful delivery
   * - bounced@resend.dev: Simulates SMTP 550 bounce
   * - complained@resend.dev: Simulates spam complaint
   */
  testEmails: {
    delivered: "delivered@resend.dev",
    bounced: "bounced@resend.dev",
    complained: "complained@resend.dev",
  },
} as const;
