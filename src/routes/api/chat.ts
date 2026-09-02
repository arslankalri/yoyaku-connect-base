import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type BusinessContext = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  postalCode?: string | null;
  website?: string | null;
  timezone?: string | null;
  hours?: { day_of_week: number; is_open: boolean; open_time: string; close_time: string }[];
  services?: { name: string; description?: string | null; price: number; duration_minutes: number }[];
  staff?: { name: string; services: string[] }[];
};

function renderContext(ctx: BusinessContext) {
  const lines: string[] = [];
  lines.push(`Business name: ${ctx.name?.trim() || "NOT PROVIDED"}`);
  lines.push(`Phone: ${ctx.phone?.trim() || "NOT PROVIDED"}`);
  lines.push(
    `Address: ${[ctx.postalCode, ctx.address].filter(Boolean).join(" ").trim() || "NOT PROVIDED"}`,
  );
  lines.push(`Website: ${ctx.website?.trim() || "NOT PROVIDED"}`);
  lines.push(`Timezone: ${ctx.timezone || "Asia/Tokyo"}`);

  lines.push("");
  lines.push("Opening hours:");
  if (ctx.hours?.length) {
    for (const h of ctx.hours) {
      lines.push(
        `- ${DAY_NAMES[h.day_of_week]}: ${
          h.is_open ? `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}` : "Closed"
        }`,
      );
    }
  } else {
    lines.push("- NOT PROVIDED");
  }

  lines.push("");
  lines.push("Services (name / price JPY / duration minutes):");
  if (ctx.services?.length) {
    for (const s of ctx.services) {
      lines.push(
        `- ${s.name} / ¥${s.price} / ${s.duration_minutes} min${
          s.description ? ` — ${s.description}` : ""
        }`,
      );
    }
  } else {
    lines.push("- NOT PROVIDED");
  }

  lines.push("");
  lines.push("Staff:");
  if (ctx.staff?.length) {
    for (const m of ctx.staff) {
      lines.push(`- ${m.name}${m.services.length ? ` (handles: ${m.services.join(", ")})` : ""}`);
    }
  } else {
    lines.push("- NOT PROVIDED");
  }

  return lines.join("\n");
}

function systemPrompt(ctx: BusinessContext, today: string) {
  return `You are NAGI (ナギ), the AI receptionist of the business described below. You are answering a customer in a text chat that simulates a phone call.

PERSONALITY
- Warm, polite, calm, helpful, concise, natural, professional.
- In Japanese, use natural polite business Japanese (丁寧語・敬語), never robotic translation.
- In English, answer naturally in English.
- ALWAYS reply in the same language the customer used in their latest message.
- Keep replies short: 1–3 sentences, like a real receptionist on the phone. Never use markdown headings, bullet lists longer than 4 items, or emoji.

BUSINESS INFORMATION (the ONLY facts you may state)
${renderContext(ctx)}
Today's date: ${today}.

STRICT RULES
- NEVER invent, guess, estimate or extrapolate any business information (prices, durations, services, discounts, hours, staff, address, policies, parking, payment methods, etc.).
- If the requested information is not in the list above or is "NOT PROVIDED", say clearly that you cannot confirm it and that a staff member needs to confirm.
  Japanese example: 「申し訳ありません。現在登録されている情報では確認できません。スタッフに確認する必要があります。」
  English example: "I'm sorry, I don't have confirmed information about that. A staff member would need to confirm."
- If the customer asks to speak with a human, politely acknowledge and offer to pass the request to staff${ctx.phone ? ` or share the phone number ${ctx.phone}` : ""}.

APPOINTMENTS (simulation only)
- You CANNOT create, change or cancel real appointments and must never claim one was made, changed or cancelled.
- For a booking request, collect the missing details conversationally, one question at a time: desired service, date, time, staff preference (if staff exist), customer name, and phone number.
- If a time is vague (e.g. "afternoon"), ask for a specific time: 「明日の午後ですね。何時頃がご希望でしょうか？」
- Once you have service + date + time + name + phone, do NOT confirm a booking. Instead output on the FIRST line exactly the token [[BOOKING_SIM]] and then, on the following lines, a short polite message explaining that this is a test and the request will be confirmed by staff.
- For change or cancellation requests, gather the details and explain that staff will confirm; never state it is done.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: unknown;
          business?: BusinessContext;
        };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const today = new Date().toISOString().slice(0, 10);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.7-flash"),
            system: systemPrompt(body.business ?? {}, today),
            messages: await convertToModelMessages(body.messages as UIMessage[]),
          });
          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "AI request failed";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
