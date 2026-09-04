import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";

/**
 * Chat transport for the NAGI receptionist.
 * All receptionist behaviour lives in the reusable brain (src/lib/nagi-brain.server.ts);
 * this route only handles HTTP + streaming so a future voice channel can share the brain.
 */
import {
  NagiError,
  createNagiSession,
  logNagiConversation,
  streamNagiReply,
  toNagiMessages,
} from "@/lib/nagi-brain.server";

const STATUS: Record<string, number> = {
  unauthorized: 401,
  backend_not_configured: 500,
  missing_api_key: 500,
  no_business: 404,
  nagi_disabled: 403,
};

function plainText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .replaceAll("[[HANDOFF]]", "")
    .replaceAll("[[BOOKING_CONFIRMED]]", "")
    .replaceAll("[[BOOKING_CANCELLED]]", "")
    .trim();
}

function transcriptOf(messages: UIMessage[]) {
  return messages
    .map((m) => `${m.role === "user" ? "Customer" : "NAGI"}: ${plainText(m)}`)
    .filter((line) => line.split(": ").slice(1).join(": ").length > 0)
    .join("\n");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown; sessionKey?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const authHeader = request.headers.get("Authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        const sessionKey = typeof body.sessionKey === "string" ? body.sessionKey : null;

        try {
          const session = await createNagiSession(token, "chat");
          const messages = body.messages as UIMessage[];
          const result = streamNagiReply(session, await toNagiMessages(messages));
          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ messages: finished }) => {
              if (!sessionKey) return;
              const transcript = transcriptOf(finished as UIMessage[]);
              if (!transcript) return;
              const firstCustomer = (finished as UIMessage[]).find((m) => m.role === "user");
              try {
                await logNagiConversation(
                  session,
                  sessionKey,
                  transcript,
                  firstCustomer ? plainText(firstCustomer).slice(0, 200) : null,
                );
              } catch {
                // Logging must never break the customer conversation.
              }
            },
          });
        } catch (error) {
          if (error instanceof NagiError) {
            return new Response(error.message, { status: STATUS[error.reason] ?? 500 });
          }
          const message = error instanceof Error ? error.message : "AI request failed";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
