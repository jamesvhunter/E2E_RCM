/**
 * Twilio SMS Client
 * Handles sending SMS messages for patient intake links
 */

import twilio from "twilio";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

interface SendSMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

class TwilioClient {
  private client: twilio.Twilio;
  private phoneNumber: string;

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.phoneNumber = config.phoneNumber;
  }

  /**
   * Send an SMS with the patient intake link
   */
  async sendIntakeSMS(
    to: string,
    intakeUrl: string,
    practiceName: string = "ClaimFlow Medical"
  ): Promise<SendSMSResult> {
    try {
      // Format phone number to E.164 if not already
      const formattedPhone = this.formatPhoneNumber(to);

      const message = await this.client.messages.create({
        body: `${practiceName}: Please complete your intake form before your appointment: ${intakeUrl}\n\nThis link expires in 48 hours.`,
        from: this.phoneNumber,
        to: formattedPhone,
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      console.error("Twilio SMS error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send SMS",
      };
    }
  }

  /**
   * Send a custom SMS message
   */
  async sendSMS(to: string, body: string): Promise<SendSMSResult> {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      const message = await this.client.messages.create({
        body,
        from: this.phoneNumber,
        to: formattedPhone,
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      console.error("Twilio SMS error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send SMS",
      };
    }
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageSid: string): Promise<string | null> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return message.status;
    } catch (error) {
      console.error("Failed to get message status:", error);
      return null;
    }
  }

  /**
   * Format phone number to E.164 format
   * Assumes US numbers if no country code provided
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // If already has country code (11+ digits starting with 1)
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }

    // If 10 digits, assume US and add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If already in E.164 format
    if (phone.startsWith("+")) {
      return phone;
    }

    // Return as-is and let Twilio validate
    return phone;
  }
}

// Singleton instance
let twilioClient: TwilioClient | null = null;

export function getTwilioClient(): TwilioClient {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      throw new Error(
        "Twilio configuration missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
      );
    }

    twilioClient = new TwilioClient({
      accountSid,
      authToken,
      phoneNumber,
    });
  }

  return twilioClient;
}

export { TwilioClient };
export type { SendSMSResult };
