/**
 * Intake Token Service
 * Handles generation, validation, and completion of secure intake tokens
 */

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getTwilioClient } from "@/lib/twilio/client";
import { getResendClient } from "@/lib/resend/client";

// Token expiry duration (48 hours in milliseconds)
const TOKEN_EXPIRY_MS = 48 * 60 * 60 * 1000;

// Rate limiting configuration
const MAX_REQUESTS_PER_TOKEN = 5;
const MAX_REQUESTS_PER_IP = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export interface CreateIntakeRequestInput {
  phone?: string;
  email?: string;
  deliveryChannel: "sms" | "email";
  providerId?: string;
  appointmentId?: string;
  dateOfService?: string;
  createdBy?: string;
}

export interface IntakeToken {
  id: string;
  token: string;
  phone: string | null;
  email: string | null;
  deliveryChannel: "sms" | "email";
  providerId: string | null;
  appointmentId: string | null;
  dateOfService: string | null;
  status: "pending" | "completed" | "expired" | "cancelled";
  patientId: string | null;
  expiresAt: string;
  completedAt: string | null;
  smsSentAt: string | null;
  smsDeliveryStatus: string | null;
  twilioMessageSid: string | null;
  emailSentAt: string | null;
  emailDeliveryStatus: string | null;
  resendEmailId: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface ValidateTokenResult {
  valid: boolean;
  token?: IntakeToken;
  error?: string;
}

export interface CompleteIntakeInput {
  token: string;
  patientId: string;
}

/**
 * Generate a cryptographically secure URL-safe token
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Create a new intake request and send via SMS or email
 */
export async function createIntakeRequest(
  input: CreateIntakeRequestInput
): Promise<{ success: boolean; token?: IntakeToken; error?: string }> {
  // Validation
  if (input.deliveryChannel === "sms" && !input.phone) {
    return { success: false, error: "Phone number required for SMS delivery" };
  }
  if (input.deliveryChannel === "email" && !input.email) {
    return { success: false, error: "Email address required for email delivery" };
  }

  const supabase = await createClient();
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();

  // Insert the token record
  const { data, error } = await supabase
    .from("intake_tokens")
    .insert({
      token,
      phone: input.phone || null,
      email: input.email || null,
      delivery_channel: input.deliveryChannel,
      provider_id: input.providerId || null,
      appointment_id: input.appointmentId || null,
      date_of_service: input.dateOfService || null,
      status: "pending",
      expires_at: expiresAt,
      created_by: input.createdBy || null,
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Failed to create intake token:", error);
    return { success: false, error: "Failed to create intake request" };
  }

  // Build the intake URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const intakeUrl = `${baseUrl}/intake/${token}`;

  let deliveryResult: { success: boolean; error?: string };

  // Send via appropriate channel
  if (input.deliveryChannel === "sms") {
    const twilioClient = getTwilioClient();
    const smsResult = await twilioClient.sendIntakeSMS(input.phone!, intakeUrl);

    // Update token with SMS status
    await supabase
      .from("intake_tokens")
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_delivery_status: smsResult.success ? "sent" : "failed",
        twilio_message_sid: smsResult.messageSid || null,
      } as any)
      .eq("id", (data as any).id);

    deliveryResult = smsResult;
  } else {
    // Email delivery
    const resendClient = getResendClient();
    const emailResult = await resendClient.sendIntakeEmail(
      input.email!,
      intakeUrl,
      input.dateOfService
    );

    // Update token with email status
    await supabase
      .from("intake_tokens")
      .update({
        email_sent_at: new Date().toISOString(),
        email_delivery_status: emailResult.success ? "sent" : "failed",
        resend_email_id: emailResult.emailId || null,
      } as any)
      .eq("id", (data as any).id);

    deliveryResult = emailResult;
  }

  if (!deliveryResult.success) {
    return {
      success: false,
      error: `${input.deliveryChannel.toUpperCase()} delivery failed: ${deliveryResult.error}`,
    };
  }

  return {
    success: true,
    token: mapDbToIntakeToken(data),
  };
}

/**
 * Validate an intake token
 */
export async function validateToken(token: string): Promise<ValidateTokenResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("intake_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return { valid: false, error: "Invalid or unknown token" };
  }

  const tokenData = data as any;

  // Check if token is expired by time
  if (new Date(tokenData.expires_at) < new Date()) {
    // Update status to expired if not already
    if (tokenData.status === "pending") {
      await supabase
        .from("intake_tokens")
        .update({ status: "expired" } as any)
        .eq("id", tokenData.id);
    }
    return { valid: false, error: "This intake link has expired" };
  }

  // Check if token is already used
  if (tokenData.status === "completed") {
    return { valid: false, error: "This intake form has already been submitted" };
  }

  // Check if token is cancelled
  if (tokenData.status === "cancelled") {
    return { valid: false, error: "This intake link has been cancelled" };
  }

  // Check if token is expired status
  if (tokenData.status === "expired") {
    return { valid: false, error: "This intake link has expired" };
  }

  return {
    valid: true,
    token: mapDbToIntakeToken(data),
  };
}

/**
 * Complete an intake by marking the token as used and linking to patient
 */
export async function completeIntake(
  input: CompleteIntakeInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // First validate the token
  const validation = await validateToken(input.token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Update the token
  const { error } = await supabase
    .from("intake_tokens")
    .update({
      status: "completed",
      patient_id: input.patientId,
      completed_at: new Date().toISOString(),
    } as any)
    .eq("token", input.token);

  if (error) {
    console.error("Failed to complete intake:", error);
    return { success: false, error: "Failed to complete intake" };
  }

  return { success: true };
}

/**
 * Check rate limits for intake submissions
 */
export async function checkRateLimit(
  identifier: string,
  identifierType: "ip" | "token"
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = await createClient();
  const maxRequests = identifierType === "ip" ? MAX_REQUESTS_PER_IP : MAX_REQUESTS_PER_TOKEN;
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  // Get current request count within window
  const { data, error } = await supabase
    .from("intake_rate_limits")
    .select("*")
    .eq("identifier", identifier)
    .eq("identifier_type", identifierType)
    .gte("window_start", windowStart)
    .single();

  if (error || !data) {
    // No existing record, create one
    await supabase.from("intake_rate_limits").insert({
      identifier,
      identifier_type: identifierType,
      request_count: 1,
      window_start: new Date().toISOString(),
    } as any);

    return { allowed: true, remaining: maxRequests - 1 };
  }

  const currentCount = (data as any).request_count;

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await supabase
    .from("intake_rate_limits")
    .update({ request_count: currentCount + 1 } as any)
    .eq("id", (data as any).id);

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

/**
 * List intake tokens with optional filters
 */
export async function listIntakeTokens(filters?: {
  status?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tokens: IntakeToken[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from("intake_tokens")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.providerId) {
    query = query.eq("provider_id", filters.providerId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list intake tokens:", error);
    return { tokens: [], total: 0 };
  }

  return {
    tokens: (data || []).map(mapDbToIntakeToken),
    total: count || 0,
  };
}

/**
 * Cancel an intake token
 */
export async function cancelIntakeToken(
  tokenId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("intake_tokens")
    .update({ status: "cancelled" } as any)
    .eq("id", tokenId)
    .eq("status", "pending"); // Only cancel pending tokens

  if (error) {
    console.error("Failed to cancel intake token:", error);
    return { success: false, error: "Failed to cancel intake request" };
  }

  return { success: true };
}

/**
 * Map database record to IntakeToken type
 */
function mapDbToIntakeToken(data: any): IntakeToken {
  return {
    id: data.id,
    token: data.token,
    phone: data.phone || null,
    email: data.email || null,
    deliveryChannel: data.delivery_channel || "sms",
    providerId: data.provider_id,
    appointmentId: data.appointment_id,
    dateOfService: data.date_of_service,
    status: data.status,
    patientId: data.patient_id,
    expiresAt: data.expires_at,
    completedAt: data.completed_at,
    smsSentAt: data.sms_sent_at,
    smsDeliveryStatus: data.sms_delivery_status,
    twilioMessageSid: data.twilio_message_sid,
    emailSentAt: data.email_sent_at,
    emailDeliveryStatus: data.email_delivery_status,
    resendEmailId: data.resend_email_id,
    createdBy: data.created_by,
    createdAt: data.created_at,
  };
}
