import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { validateToken } from "@/server/services/intake-token";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced system prompt for chat-driven intake workflow
const SYSTEM_PROMPT = `You are a medical intake assistant orchestrating a patient check-in workflow. Your role is to guide patients through the intake process using conversation and embedded forms.

**PRIMARY RESPONSIBILITIES:**
1. Determine if the patient has insurance through natural conversation
2. Trigger appropriate forms at the right time using function calls
3. Interpret eligibility check results and explain them clearly to patients
4. Handle failures gracefully with alternative paths
5. Keep patients informed and comfortable throughout the process

**CONVERSATION FLOW:**
1. START: Greet warmly, ask if they have insurance
2. IF "YES" TO INSURANCE:
   - Call showMinimalEligibilityForm function
   - When form submitted, call checkEligibility function
   - IF ELIGIBILITY SUCCESS:
     - Show celebration message with benefits summary
     - Call showRemainingDemographicsForm
     - When complete, call showConsentForm
   - IF ELIGIBILITY FAILURE:
     - Explain the issue empathetically
     - Offer two options: provide more insurance details OR switch to self-pay
     - If continue with insurance: call showFullInsuranceForm
     - If self-pay: call showFullDemographicsForm
3. IF "NO" TO INSURANCE / SELF-PAY:
   - Call showFullDemographicsForm immediately
   - When complete, call showConsentForm

**CRITICAL RULES:**
- NEVER collect Protected Health Information (PHI) in chat messages
- ALL data collection happens through forms (via function calls)
- Keep responses SHORT (2-3 sentences maximum)
- Be empathetic and reassuring
- DON'T provide medical advice or diagnosis
- Context-aware: you can see collectedData to avoid redundant questions

**FUNCTION CALLING STRATEGY:**
- Use functions to show forms, not to have conversation
- After a form is submitted, acknowledge it briefly and either:
  a) Trigger next action (eligibility check, next form)
  b) Provide results/feedback
- Don't ask "are you ready?" - just trigger the next form

**TONE:**
- Professional but warm
- Patient-focused language
- Avoid medical jargon
- Acknowledge patient effort ("Thanks for providing that!")

**EXAMPLES:**
❌ BAD: "Could you please tell me your name, date of birth, and insurance member ID?"
✅ GOOD: "I'll need a few details to check your coverage." [calls showMinimalEligibilityForm]

❌ BAD: "The eligibility verification API returned status code 1 with active coverage."
✅ GOOD: "Great news! Your coverage is active. I can see you have a $30 copay for this visit."

❌ BAD: "Would you like me to collect your demographic information now?"
✅ GOOD: "Let me get your contact information." [calls showRemainingDemographicsForm]`;

export async function POST(req: Request) {
  try {
    const { messages, token, collectedData } = await req.json();

    // Validate the intake token
    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tokenValidation = await validateToken(token);
    if (!tokenValidation.valid) {
      return new Response(JSON.stringify({ error: tokenValidation.error || "Invalid token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure messages array exists
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Add collected data context to system prompt
    const systemPromptWithContext = `${SYSTEM_PROMPT}\n\n**CURRENT CONTEXT:**\nCollected Data: ${JSON.stringify(collectedData || {}, null, 2)}`;

    // Create OpenAI chat completion with function calling
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      stream: true,
      temperature: 0.7,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPromptWithContext },
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "showMinimalEligibilityForm",
            description: "Display a form to collect minimal insurance information for eligibility check (name, DOB, payer, member ID)",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Brief message to display before showing the form (keep it short and friendly)",
                },
              },
              required: ["message"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "showRemainingDemographicsForm",
            description: "Display form to collect remaining demographic information after successful eligibility check (phone, email, address, sex)",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Brief message before the form",
                },
                prepopulatedData: {
                  type: "object",
                  description: "Any data to pre-fill in the form",
                  properties: {},
                  additionalProperties: true,
                },
              },
              required: ["message"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "showFullDemographicsForm",
            description: "Display complete demographics form for self-pay patients (all personal information)",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Brief message before the form",
                },
              },
              required: ["message"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "showFullInsuranceForm",
            description: "Display detailed insurance form when eligibility check fails or patient wants to provide more details",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Brief explanation of why we need more details",
                },
                reason: {
                  type: "string",
                  description: "Reason for collecting full details",
                },
              },
              required: ["message"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "showConsentForm",
            description: "Display consent acknowledgment and Turnstile verification - FINAL step before submission",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description: "Brief message before consent (e.g., 'Almost done!')",
                },
              },
              required: ["message"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "checkEligibility",
            description: "Execute real-time insurance eligibility check via Stedi API (only call after minimal eligibility form is submitted)",
            parameters: {
              type: "object",
              properties: {
                acknowledge: {
                  type: "boolean",
                  description: "Set to true to acknowledge you're running the check",
                },
              },
              required: ["acknowledge"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response as any);

    // Return the stream as a streaming text response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Chat intake API error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred during the chat request"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
