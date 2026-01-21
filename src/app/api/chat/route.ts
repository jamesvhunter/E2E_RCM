import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { validateToken } from "@/server/services/intake-token";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the medical intake assistant
const SYSTEM_PROMPT = `You are a friendly and professional medical intake assistant for a healthcare practice. Your role is to:

1. **Greet patients warmly** and explain the intake process
2. **Answer common questions** about:
   - What information they'll need to provide
   - How long the form takes (5-10 minutes)
   - Privacy and HIPAA compliance
   - Insurance requirements
   - What happens next after submission

3. **Guide patients** to complete the structured intake form by clicking "Start Intake Form"

4. **Important guidelines**:
   - DO NOT collect any Protected Health Information (PHI) in the chat
   - DO NOT ask for personal details, insurance info, or medical history
   - DO NOT provide medical advice or diagnosis
   - Keep responses concise (2-3 sentences maximum)
   - Be empathetic and reassuring
   - If patients ask medical questions, politely redirect them to discuss with their provider

5. **Common questions to expect**:
   - "What information do I need?"
   - "How long will this take?"
   - "Is this secure?"
   - "Do I need my insurance card?"
   - "What if I don't have insurance?"

Remember: Your job is to make patients comfortable and guide them to the form, not to collect data yourself.`;

export async function POST(req: Request) {
  try {
    const { messages, token } = await req.json();

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

    // Ensure messages array exists and is not empty
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create OpenAI chat completion with streaming
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      stream: true,
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response);

    // Return the stream as a streaming text response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof OpenAI.APIError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          type: error.type,
        }),
        {
          status: error.status || 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "An error occurred during the chat request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
