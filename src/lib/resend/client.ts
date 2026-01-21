import { Resend } from "resend";
import { emailConfig } from "@/config/email";

// ============================================================================
// Resend Email Client
// Follows the Twilio client pattern for consistency
// ============================================================================

interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

class ResendClient {
  private client: Resend;
  private fromEmail: string;
  private fromName: string;

  constructor(config: ResendConfig) {
    this.client = new Resend(config.apiKey);
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  /**
   * Send patient intake email with secure link
   * @param to Patient email address
   * @param intakeUrl Unique intake form URL
   * @param appointmentDate Optional appointment date for context
   * @param practiceName Practice name for branding
   */
  async sendIntakeEmail(
    to: string,
    intakeUrl: string,
    appointmentDate?: string,
    practiceName: string = "ClaimFlow Medical"
  ): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: `Complete Your Patient Intake Form - ${practiceName}`,
        html: this.generateIntakeEmailHtml(intakeUrl, appointmentDate, practiceName),
        text: this.generateIntakeEmailText(intakeUrl, appointmentDate, practiceName),
      });

      if (error) {
        console.error("Resend email error:", error);
        return {
          success: false,
          error: error.message || "Failed to send email",
        };
      }

      return {
        success: true,
        emailId: data?.id,
      };
    } catch (error) {
      console.error("Resend email exception:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  /**
   * Generate HTML email template
   * Professional, mobile-responsive design
   */
  private generateIntakeEmailHtml(
    intakeUrl: string,
    appointmentDate: string | undefined,
    practiceName: string
  ): string {
    const appointmentDateFormatted = appointmentDate
      ? new Date(appointmentDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Intake Form</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${practiceName}</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Patient Intake Portal</p>
    </div>

    <!-- Body -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #0ea5e9; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Complete Your Patient Intake Form</h2>

      ${
        appointmentDateFormatted
          ? `
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #0ea5e9; padding: 16px 20px; margin: 24px 0; border-radius: 6px;">
        <p style="margin: 0; font-size: 14px; color: #0c4a6e; font-weight: 600;">YOUR UPCOMING APPOINTMENT</p>
        <p style="margin: 8px 0 0 0; font-size: 18px; color: #0369a1; font-weight: 600;">${appointmentDateFormatted}</p>
      </div>
      `
          : ""
      }

      <p style="margin: 24px 0; font-size: 16px; color: #334155;">
        To ensure we provide you with the best care possible, please complete your patient intake form before your appointment.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px 0; font-size: 15px; color: #475569; font-weight: 600;">This form includes:</p>
        <ul style="margin: 0; padding-left: 20px; color: #64748b;">
          <li style="margin-bottom: 8px; font-size: 15px;">Personal and contact information</li>
          <li style="margin-bottom: 8px; font-size: 15px;">Insurance details (if applicable)</li>
          <li style="margin-bottom: 8px; font-size: 15px;">Medical history consent</li>
        </ul>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #64748b;">
          ⏱️ <strong>Takes approximately 5-10 minutes</strong>
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${intakeUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(14, 165, 233, 0.25); transition: background 0.2s;">
          Complete Intake Form →
        </a>
      </div>

      <p style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
        <strong style="color: #475569;">🔒 Security Notice:</strong> This link is unique to you and expires in 48 hours. Please do not share this link with others.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">
        If you didn't request this form or have questions, please contact our office.
      </p>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #cbd5e1;">
        © ${new Date().getFullYear()} ${practiceName}. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email fallback
   * For email clients that don't support HTML
   */
  private generateIntakeEmailText(
    intakeUrl: string,
    appointmentDate: string | undefined,
    practiceName: string
  ): string {
    const appointmentDateFormatted = appointmentDate
      ? new Date(appointmentDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

    return `
${practiceName}
Patient Intake Portal

Complete Your Patient Intake Form

${
  appointmentDateFormatted
    ? `YOUR UPCOMING APPOINTMENT
${appointmentDateFormatted}

`
    : ""
}To ensure we provide you with the best care possible, please complete your patient intake form before your appointment.

This form includes:
• Personal and contact information
• Insurance details (if applicable)
• Medical history consent

Takes approximately 5-10 minutes to complete.

Complete your intake form here:
${intakeUrl}

---

🔒 SECURITY NOTICE: This link is unique to you and expires in 48 hours. Please do not share this link with others.

If you didn't request this form or have questions, please contact our office.

© ${new Date().getFullYear()} ${practiceName}. All rights reserved.
    `.trim();
  }

  /**
   * Generic send email method for future use
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject,
        html,
        text,
      });

      if (error) {
        return {
          success: false,
          error: error.message || "Failed to send email",
        };
      }

      return {
        success: true,
        emailId: data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let resendClient: ResendClient | null = null;

export function getResendClient(): ResendClient {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. Please add it to your .env.local file."
      );
    }

    if (apiKey === "re_your_api_key" || apiKey.startsWith("re_test_")) {
      console.warn(
        "⚠️  Warning: Using test Resend API key. Emails will not be delivered in production."
      );
    }

    // Use centralized email config (hardcoded, not from env)
    console.log(`📧 Resend configured with FROM: ${emailConfig.fromEmail} (${emailConfig.fromName})`);

    resendClient = new ResendClient({
      apiKey,
      fromEmail: emailConfig.fromEmail,
      fromName: emailConfig.fromName,
    });
  }

  return resendClient;
}

export { ResendClient };
export type { SendEmailResult };
