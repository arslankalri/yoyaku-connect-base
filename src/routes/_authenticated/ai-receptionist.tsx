import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Activity, Eraser, RotateCcw, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hhmm, useBusiness, useBusinessHours, useServices, useStaff } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/ai-receptionist")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AI Receptionist / AI受付 — NAGI AI" },
      {
        name: "description",
        content:
          "Test the NAGI AI receptionist in a live text simulation using your own business hours, services, and staff.",
      },
      { property: "og:title", content: "AI Receptionist / AI受付 — NAGI AI" },
      {
        property: "og:description",
        content: "Live text simulation of the NAGI AI receptionist for your business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const BOOKING_TOKEN = "[[BOOKING_SIM]]";

const SCENARIOS = [
  { key: "recept.test.book", ja: "予約したい", en: "I want to make an appointment" },
  { key: "recept.test.price", ja: "料金を知りたい", en: "What's the price?" },
  { key: "recept.test.hours", ja: "営業時間は？", en: "What are your opening hours?" },
  { key: "recept.test.tomorrow", ja: "明日予約したい", en: "I want to book tomorrow" },
  { key: "recept.test.cancel", ja: "キャンセルしたい", en: "I want to cancel" },
  { key: "recept.test.staff", ja: "スタッフと話したい", en: "I want to speak with a staff member" },
] as const;

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function activityKeyFor(text: string) {
  const s = text.toLowerCase();
  if (/予約|キャンセル|変更|book|appointment|cancel|reschedul/.test(s)) return "recept.act.booking";
  if (/料金|値段|価格|いくら|price|cost|how much|時間|分|duration/.test(s)) return "recept.act.services";
  if (/営業|何時|開い|閉ま|hour|open|clos/.test(s)) return "recept.act.hours";
  if (/スタッフ|担当|指名|staff|stylist|person/.test(s)) return "recept.act.staff";
  if (/場所|住所|どこ|電話|address|location|where|phone/.test(s)) return "recept.act.business";
  return "recept.act.thinking";
}

function Page() {
  const { t, language } = useI18n();
  const { data: business } = useBusiness();
  const { data: hours } = useBusinessHours(business?.id);
  const { data: services } = useServices(business?.id);
  const { data: staff } = useStaff(business?.id);

  const [sessionId, setSessionId] = useState(() => `nagi-${Date.now()}`);
  const [input, setInput] = useState("");
  const [activityKey, setActivityKey] = useState("recept.act.idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const businessContext = useMemo(
    () => ({
      name: business?.name ?? null,
      phone: business?.phone ?? null,
      address: business?.address ?? null,
      postalCode: business?.postal_code ?? null,
      website: business?.website ?? null,
      timezone: business?.timezone ?? "Asia/Tokyo",
      hours: (hours ?? []).map((h) => ({
        day_of_week: h.day_of_week,
        is_open: h.is_open,
        open_time: hhmm(h.open_time),
        close_time: hhmm(h.close_time),
      })),
      services: (services ?? [])
        .filter((s) => s.is_active)
        .map((s) => ({
          name: s.name,
          description: s.description,
          price: s.price,
          duration_minutes: s.duration_minutes,
        })),
      staff: (staff ?? [])
        .filter((m) => m.is_active)
        .map((m) => ({
          name: m.name,
          services: m.staff_services
            .map((link) => (services ?? []).find((s) => s.id === link.service_id)?.name)
            .filter((n): n is string => !!n),
        })),
    }),
    [business, hours, services, staff],
  );

  const contextRef = useRef(businessContext);
  contextRef.current = businessContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ business: contextRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, setMessages, status } = useChat({
    id: sessionId,
    transport,
    onError: () => toast.error(t("recept.error")),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    if (!busy) setActivityKey("recept.act.idle");
  }, [busy]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setActivityKey(activityKeyFor(value));
    setInput("");
    await sendMessage({ text: value });
    inputRef.current?.focus();
  }

  function reset() {
    setMessages([]);
    setSessionId(`nagi-${Date.now()}`);
    setActivityKey("recept.act.idle");
    setInput("");
  }

  return (
    <AppShell title={t("recept.title")} description={t("recept.desc")}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="panel flex min-h-[62vh] flex-col overflow-hidden lg:min-h-[70vh]">
          <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
              凪
              <span className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-card">
                <span className="size-2 animate-pulse rounded-full bg-success" />
              </span>
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">NAGI AI</p>
              <p className="truncate text-xs text-success">{t("recept.status")}</p>
            </div>
            <span className="ml-auto rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
              {t("recept.testMode")}
            </span>
          </header>

          <p className="border-b border-border bg-secondary/40 px-4 py-2 text-[11px] leading-relaxed text-muted-foreground">
            {t("recept.testModeNote")}
          </p>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center">
                <Sparkles className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("recept.empty")}</p>
                {!business && (
                  <p className="text-xs text-warning-foreground">{t("recept.noBusiness")}</p>
                )}
              </div>
            )}

            {messages.map((message) => {
              const raw = textOf(message);
              const isUser = message.role === "user";
              const booking = !isUser && raw.includes(BOOKING_TOKEN);
              const body = raw.replaceAll(BOOKING_TOKEN, "").trim();
              return (
                <div key={message.id} className="space-y-2">
                  {booking && (
                    <div className="mx-auto max-w-md space-y-1 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-center text-[11px] text-warning-foreground">
                      <p>{t("recept.sim.processing")}</p>
                      <p className="font-medium">{t("recept.sim.result")}</p>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex animate-in fade-in slide-in-from-bottom-1 duration-300",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    <div className="max-w-[85%] space-y-1">
                      <div
                        className={cn(
                          "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                          isUser
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-secondary text-foreground",
                        )}
                      >
                        {body || "…"}
                      </div>
                      <p
                        className={cn(
                          "px-1 text-[10px] text-muted-foreground",
                          isUser ? "text-right" : "text-left",
                        )}
                      >
                        {isUser ? t("recept.customer") : "NAGI"} ·{" "}
                        {new Date().toLocaleTimeString(language === "ja" ? "ja-JP" : "en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-3">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                  <span className="text-[11px] text-muted-foreground">{t("recept.typing")}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("recept.placeholder")}
              aria-label={t("recept.placeholder")}
            />
            <Button type="submit" size="icon" disabled={busy || input.trim().length === 0}>
              <Send className="size-4" />
              <span className="sr-only">{t("recept.send")}</span>
            </Button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="panel p-4">
            <p className="eyebrow flex items-center gap-1.5">
              <Activity className="size-3.5" />
              {t("recept.activity")}
            </p>
            <p
              className={cn(
                "mt-2 flex items-start gap-2 text-sm transition-colors",
                busy ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  busy ? "animate-pulse bg-primary" : "bg-muted-foreground/40",
                )}
              />
              {t(busy ? activityKey : "recept.act.idle")}
            </p>
          </div>

          <div className="panel p-4">
            <p className="eyebrow">{t("recept.tests")}</p>
            <div className="mt-3 flex flex-col gap-2">
              {SCENARIOS.map((s) => (
                <Button
                  key={s.key}
                  variant="outline"
                  size="sm"
                  className="justify-start text-left"
                  disabled={busy}
                  onClick={() => void send(language === "ja" ? s.ja : s.en)}
                >
                  {t(s.key)}
                </Button>
              ))}
            </div>
          </div>

          <div className="panel flex flex-col gap-2 p-4">
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              disabled={busy || messages.length === 0}
              onClick={() => setMessages([])}
            >
              <Eraser className="size-4" />
              {t("recept.clear")}
            </Button>
            <Button variant="secondary" size="sm" className="justify-start" disabled={busy} onClick={reset}>
              <RotateCcw className="size-4" />
              {t("recept.new")}
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
