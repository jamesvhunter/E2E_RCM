/**
 * Cloudflare Turnstile Verification
 * Server-side validation for bot protection
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
  challengeTs?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile token server-side
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    // In development, skip verification if no key configured
    if (process.env.NODE_ENV === "development") {
      console.warn("Turnstile secret key not configured, skipping verification in development");
      return { success: true };
    }
    return { success: false, error: "Turnstile not configured" };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        challengeTs: result.challenge_ts,
        hostname: result.hostname,
      };
    }

    // Map error codes to user-friendly messages
    const errorCodes = result["error-codes"] || [];
    let errorMessage = "Verification failed";

    if (errorCodes.includes("invalid-input-response")) {
      errorMessage = "Invalid verification token";
    } else if (errorCodes.includes("timeout-or-duplicate")) {
      errorMessage = "Verification expired, please try again";
    } else if (errorCodes.includes("bad-request")) {
      errorMessage = "Verification request malformed";
    }

    return { success: false, error: errorMessage };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return { success: false, error: "Verification service unavailable" };
  }
}
