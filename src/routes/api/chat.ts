import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  DAY_NAMES_EN,
  DAY_NAMES_JA,
  createUserClient,
  getBusinessForUser,
  get_business_hours,
  get_business_info,
  get_service_details,
  get_services,
  get_staff,
  get_staff_services,
  type AuthedClient,
} from "@/lib/nagi-data.server";

function dateContext(timezone: string) {
  const now = new Date();
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  // Resolve the weekday index in the business timezone.
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(now);
  const weekdayIndex = Math.max(
    0,
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekdayShort),
  );
  const day = 86_400_000;
  const label = (offset: number) => {
    const d = new Date(now.getTime() + offset * day);
    const idx = (weekdayIndex + offset) % 7;
    return `${fmt(d)} (${DAY_NAMES_EN[idx]} / ${DAY_NAMES_JA[idx]}曜日, day_of_week=${idx})`;
  };
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return [
    `Timezone: ${timezone}`,
    `Current local time: ${clock}`,
    `Today / 今日: ${label(0)}`,
    `Tomorrow / 明日: ${label(1)}`,
    `Day after tomorrow / 明後日: ${label(2)}`,
  ].join("\n");
}

function buildTools(supabase: AuthedClient, businessId: string) {
  return {
    get_business_info: tool({
      description:
        "Get the business name, phone number, address, website and timezone. Use for location, contact or general questions.",
      inputSchema: z.object({}),
      execute: async () => get_business_info(supabase, businessId),
    }),
    get_business_hours: tool({
      description:
        "Get the weekly opening hours (per day_of_week, 0=Sunday). Use for any question about opening/closing times or holidays.",
      inputSchema: z.object({}),
      execute: async () => get_business_hours(supabase, businessId),
    }),
    get_services: tool({
      description: "List all active services with price (JPY), duration in minutes and description.",
      inputSchema: z.object({}),
      execute: async () => get_services(supabase, businessId),
    }),
    get_service_details: tool({
      description:
        "Get the price, duration, description and capable staff for one named service. Use for questions like 'how much is a cut?'.",
      inputSchema: z.object({ service: z.string().describe("Service name as the customer said it") }),
      execute: async ({ service }) => get_service_details(supabase, businessId, service),
    }),
    get_staff: tool({
      description: "List active staff with the services they handle and their working hours.",
      inputSchema: z.object({}),
      execute: async () => get_staff(supabase, businessId),
    }),
    get_staff_services: tool({
      description: "Get the services one named staff member can provide.",
      inputSchema: z.object({ staff: z.string().describe("Staff member name") }),
      execute: async ({ staff }) => get_staff_services(supabase, businessId, staff),
    }),
  };
}

function systemPrompt(businessName: string, timezone: string) {
  return `You are NAGI (ナギ), the AI receptionist of "${businessName}". You are answering a customer in a text chat that simulates a phone call.

PERSONALITY
- Warm, polite, calm, helpful, concise, natural, professional.
- In Japanese, use natural polite business Japanese (丁寧語・敬語), never robotic translation.
- ALWAYS reply in the same language the customer used in their latest message. Never translate business data (service names, staff names) — quote them exactly as stored.
- Keep replies short: 1–3 sentences, like a real receptionist on the phone. No markdown headings and no emoji.

DATE CONTEXT
${dateContext(timezone)}
When the customer says today/tomorrow/明日/明後日 or a weekday name, resolve it to the matching day_of_week and use the stored hours for that day.

DATA ACCESS — CRITICAL
- You know NOTHING about this business except what the tools return. Prices, durations, hours, staff, address and phone MUST come from a tool call in this conversation.
- Call the tools whenever a factual answer is needed, every time (data may have changed since the last message).
- NEVER invent, guess, estimate or extrapolate: prices, discounts, promotions, opening hours, staff availability, services, policies, parking, facilities, payment methods.
- If the tools do not contain the requested information, say so clearly and escalate to staff.
  Japanese: 「申し訳ありません。現在登録されている店舗情報では、〇〇について確認できません。スタッフに確認いたしますので、少しお時間をいただけますか。」
  English: "I'm sorry, I don't have confirmed information about that. A staff member would need to confirm it for you."
- Format JPY prices naturally (e.g. 4,000円 in Japanese, ¥4,000 in English) and durations in minutes.

APPOINTMENTS (simulation only)
- You CANNOT create, change or cancel real appointments and must never claim one was made, changed or cancelled.
- For a booking request, collect the missing details conversationally, one question at a time: service, date, time, staff preference (if staff exist), customer name, phone number.
- If a time is vague (e.g. "afternoon"), ask for a specific time.
- Once you have service + date + time + name + phone, do NOT confirm a booking. Output on the FIRST line exactly the token [[BOOKING_SIM]] and then a short polite message explaining this is a test and staff will confirm.
- For change or cancellation requests, gather details and explain that staff will confirm; never state it is done.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const authHeader = request.headers.get("Authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let supabase: AuthedClient;
        try {
          supabase = createUserClient(token);
        } catch {
          return new Response("Backend not configured", { status: 500 });
        }

        const { data: userData } = await supabase.auth.getUser(token);
        if (!userData.user) return new Response("Unauthorized", { status: 401 });

        const business = await getBusinessForUser(supabase);
        if (!business) return new Response("No business found for this account", { status: 404 });

        const gateway = createLovableAiGatewayProvider(key);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.7-flash"),
            system: systemPrompt(business.name, business.timezone || "Asia/Tokyo"),
            messages: await convertToModelMessages(body.messages as UIMessage[]),
            tools: buildTools(supabase, business.id),
            stopWhen: stepCountIs(12),
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
