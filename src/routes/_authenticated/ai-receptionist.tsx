import { useChat } from "@ai-sdk/react";
import { createFileRoute } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Activity,
  Clock3,
  Database,
  Eraser,
  HelpCircle,
  Loader2,
  ScrollText,
  RotateCcw,
  Scissors,
  Send,
  Sparkles,
  Store,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { OnlineDot, Waveform } from "@/components/ai-background";
import { AppShell } from "@/components/app-shell";
import { FaqManager } from "@/components/faq-manager";
import { NagiSettingsPanel } from "@/components/nagi-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  useBusiness,
  useBusinessHours,
  useFaqs,
  useNagiSettings,
  useServices,
  useStaff,
} from "@/lib/api";
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
const HANDOFF_TOKEN = "[[HANDOFF]]";
const CONFIRMED_TOKEN = "[[BOOKING_CONFIRMED]]";

const SCENARIOS = [
  { key: "recept.test.book", ja: "予約したい", en: "I want to make an appointment" },
  { key: "recept.test.price", ja: "カットはいくらですか？", en: "What services do you offer?" },
  { key: "recept.test.hours", ja: "営業時間は？", en: "What are your opening hours?" },
  {
    key: "recept.test.tomorrow",
    ja: "明日は何時まで営業していますか？",
    en: "How late are you open tomorrow?",
  },
  {
    key: "recept.test.colorStaff",
    ja: "カラーは誰が担当できますか？",
    en: "Which staff can do a colour?",
  },
  { key: "recept.test.unknown", ja: "駐車場ありますか？", en: "Do you have parking?" },
  { key: "recept.test.cancel", ja: "キャンセルしたい", en: "I want to cancel" },
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
  if (/料金|値段|価格|いくら|price|cost|how much|時間|分|duration|service|サービス/.test(s))
    return "recept.act.services";
  if (/営業|何時|開い|閉ま|hour|open|clos/.test(s)) return "recept.act.hours";
  if (/スタッフ|担当|指名|staff|stylist|person/.test(s)) return "recept.act.staff";
  if (/場所|住所|どこ|電話|address|location|where|phone/.test(s)) return "recept.act.business";
  return "recept.act.thinking";
}

/** Animated NAGI identity orb with pulsing rings. */
function NagiOrb({ active }: { active: boolean }) {
  return (
    <span className="relative grid size-12 shrink-0 place-items-center">
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full bg-ai-indigo/25 blur-md",
          active && "animate-pulse",
        )}
      />
      <span
        className="glow-border relative grid size-11 place-items-center rounded-full text-base font-semibold text-primary-foreground"
        style={{ backgroundImage: "var(--gradient-ai)" }}
      >
        凪
      </span>
    </span>
  );
}

function DataRow({
  icon,
  label,
  value,
  ready,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ready: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md border",
          ready
            ? "border-success/30 bg-success/10 text-success"
            : "border-border bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span
        className={cn(
          "shrink-0 text-xs font-medium",
          ready ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </li>
  );
}

function Page() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const hoursQuery = useBusinessHours(business?.id);
  const servicesQuery = useServices(business?.id);
  const staffQuery = useStaff(business?.id);
  const faqsQuery = useFaqs(business?.id);
  const settingsQuery = useNagiSettings(business?.id);
  const settings = settingsQuery.data;
  const [tab, setTab] = useState("chat");

  const [sessionId, setSessionId] = useState(() => `nagi-${Date.now()}`);
  const [input, setInput] = useState("");
  const [activityKey, setActivityKey] = useState("recept.act.idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const syncing =
    businessQuery.isFetching ||
    hoursQuery.isFetching ||
    servicesQuery.isFetching ||
    staffQuery.isFetching ||
    faqsQuery.isFetching ||
    settingsQuery.isFetching;

  const activeFaqs = (faqsQuery.data ?? []).filter((f) => f.is_active).length;
  const hasPolicies =
    !!settings &&
    [
      settings.cancellation_policy,
      settings.late_arrival_policy,
      settings.reservation_policy,
      settings.other_policies,
    ].some((value) => value.trim().length > 0);
  const nagiOnline = settings?.is_enabled !== false;

  const openDays = (hoursQuery.data ?? []).filter((h) => h.is_open).length;
  const activeServices = (servicesQuery.data ?? []).filter((s) => s.is_active).length;
  const activeStaff = (staffQuery.data ?? []).filter((s) => s.is_active).length;

  // The chat endpoint reads business data server-side under the owner's own
  // Supabase session, so only the bearer token travels with the request.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
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

  const chips = SCENARIOS.slice(0, 5);

  return (
    <AppShell title={t("recept.title")} description={t("recept.desc")}>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">{t("nagi.tab.chat")}</TabsTrigger>
          <TabsTrigger value="settings">{t("nagi.tab.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="glass-panel glow-border flex min-h-[62vh] flex-col overflow-hidden lg:min-h-[72vh]">
              <header className="relative flex flex-wrap items-center gap-3 border-b border-border/70 p-4">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{ backgroundImage: "var(--gradient-ai-soft)" }}
                />
                <NagiOrb active={busy} />
                <div className="relative min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold">NAGI AI</p>
                  {nagiOnline ? (
                    <p className="flex items-center gap-1.5 truncate text-xs text-success">
                      <OnlineDot />
                      {t("recept.status")}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-muted-foreground">{t("nagi.offline")}</p>
                  )}
                </div>
                <div className="relative ml-auto flex items-center gap-3">
                  <Waveform active={busy} />
                  <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                    {t("recept.testMode")}
                  </span>
                </div>
              </header>

              {!nagiOnline && (
                <p className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-[11px] font-medium text-warning-foreground">
                  {t("nagi.offlineBanner")}
                </p>
              )}
              <p className="border-b border-border/70 bg-secondary/30 px-4 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {t("recept.testModeNote")}
              </p>

              <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {messages.length === 0 && (
                  <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-center">
                    <span className="grid size-12 place-items-center rounded-2xl border border-ai-indigo/25 bg-ai-indigo/10">
                      <Sparkles className="size-5 text-ai-indigo" />
                    </span>
                    <p className="max-w-sm text-sm text-muted-foreground">{t("recept.empty")}</p>
                    {!business && (
                      <p className="text-xs text-warning-foreground">{t("recept.noBusiness")}</p>
                    )}
                  </div>
                )}

                {messages.map((message) => {
                  const raw = textOf(message);
                  const isUser = message.role === "user";
                  const booking = !isUser && raw.includes(BOOKING_TOKEN);
                  const handoff = !isUser && raw.includes(HANDOFF_TOKEN);
                  const confirmed = !isUser && raw.includes(CONFIRMED_TOKEN);
                  const body = raw
                    .replaceAll(BOOKING_TOKEN, "")
                    .replaceAll(HANDOFF_TOKEN, "")
                    .replaceAll(CONFIRMED_TOKEN, "")
                    .trim();
                  return (
                    <div key={message.id} className="space-y-2">
                      {booking && (
                        <div className="mx-auto max-w-md space-y-1 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-center text-[11px] text-warning-foreground">
                          <p>{t("recept.sim.processing")}</p>
                          <p className="font-medium">{t("recept.sim.result")}</p>
                        </div>
                      )}
                      {confirmed && (
                        <div className="mx-auto max-w-md rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-center text-[11px] font-medium text-success">
                          <p>{t("recept.calendar.booked")}</p>
                        </div>
                      )}
                      {handoff && (
                        <div className="mx-auto max-w-md rounded-xl border border-ai-indigo/35 bg-ai-indigo/10 px-3 py-2 text-center text-[11px] text-foreground">
                          <p>{t("recept.sim.handoff")}</p>
                          <p className="text-muted-foreground">{t("nagi.handoff.note")}</p>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                          isUser ? "justify-end" : "justify-start",
                        )}
                      >
                        <div className="flex max-w-[88%] items-end gap-2 sm:max-w-[80%]">
                          {!isUser && (
                            <span
                              aria-hidden
                              className="mb-5 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-primary-foreground"
                              style={{ backgroundImage: "var(--gradient-ai)" }}
                            >
                              凪
                            </span>
                          )}
                          <div className="min-w-0 space-y-1">
                            <div
                              className={cn(
                                "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                                isUser
                                  ? "rounded-br-sm bg-primary text-primary-foreground"
                                  : "rounded-bl-sm border border-ai-indigo/20 bg-card/80 text-foreground",
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
                              {new Date().toLocaleTimeString(
                                language === "ja" ? "ja-JP" : "en-US",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {busy && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-ai-indigo/20 bg-card/80 px-3.5 py-3">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="size-1.5 animate-bounce rounded-full bg-ai-indigo"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                      <span className="text-[11px] text-muted-foreground">
                        {t("recept.typing")}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/70 px-3 pt-3">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(language === "ja" ? chip.ja : chip.en)}
                    className="rounded-full border border-ai-indigo/25 bg-ai-indigo/5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-ai-indigo/50 hover:bg-ai-indigo/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {language === "ja" ? chip.ja : chip.en}
                  </button>
                ))}
              </div>

              <form
                className="flex items-center gap-2 p-3"
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
                  className="bg-background/70"
                />
                <Button type="submit" size="icon" disabled={busy || input.trim().length === 0}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  <span className="sr-only">{t("recept.send")}</span>
                </Button>
              </form>
            </section>

            <aside className="space-y-4">
              <div className="glass-panel p-4">
                <p className="eyebrow flex items-center gap-1.5">
                  <Database className="size-3.5" />
                  {t("recept.data.title")}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {syncing ? (
                    <>
                      <Loader2 className="size-3 animate-spin text-ai-indigo" />
                      {t("recept.data.syncing")}
                    </>
                  ) : (
                    <>
                      <OnlineDot />
                      {t("recept.data.connected")}
                    </>
                  )}
                </p>
                <ul className="mt-3 space-y-2">
                  <DataRow
                    icon={<Store className="size-3.5" />}
                    label={t("recept.data.business")}
                    value={business ? "✓" : "—"}
                    ready={!!business}
                  />
                  <DataRow
                    icon={<Clock3 className="size-3.5" />}
                    label={t("recept.data.hours")}
                    value={
                      openDays > 0 ? t("recept.data.days").replace("{n}", String(openDays)) : "—"
                    }
                    ready={openDays > 0}
                  />
                  <DataRow
                    icon={<Scissors className="size-3.5" />}
                    label={t("recept.data.services")}
                    value={
                      activeServices > 0
                        ? t("recept.data.items").replace("{n}", String(activeServices))
                        : "—"
                    }
                    ready={activeServices > 0}
                  />
                  <DataRow
                    icon={<UsersRound className="size-3.5" />}
                    label={t("recept.data.staff")}
                    value={
                      activeStaff > 0
                        ? t("recept.data.people").replace("{n}", String(activeStaff))
                        : "—"
                    }
                    ready={activeStaff > 0}
                  />
                  <DataRow
                    icon={<HelpCircle className="size-3.5" />}
                    label={t("nagi.knowledge.faqs")}
                    value={activeFaqs > 0 ? String(activeFaqs) : "—"}
                    ready={activeFaqs > 0}
                  />
                  <DataRow
                    icon={<ScrollText className="size-3.5" />}
                    label={t("nagi.knowledge.policies")}
                    value={
                      hasPolicies ? t("nagi.knowledge.configured") : t("nagi.knowledge.missing")
                    }
                    ready={hasPolicies}
                  />
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  {t("recept.data.note")}
                </p>
              </div>

              <div className="glass-panel p-4">
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
                      busy ? "animate-pulse bg-ai-indigo" : "bg-muted-foreground/40",
                    )}
                  />
                  {t(busy ? activityKey : "recept.act.idle")}
                </p>
              </div>

              <div className="glass-panel p-4">
                <p className="eyebrow">{t("recept.tests")}</p>
                <div className="mt-3 flex flex-col gap-2">
                  {SCENARIOS.map((s) => (
                    <Button
                      key={s.key}
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start whitespace-normal py-2 text-left"
                      disabled={busy}
                      onClick={() => void send(language === "ja" ? s.ja : s.en)}
                    >
                      {language === "ja" ? s.ja : s.en}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="glass-panel flex flex-col gap-2 p-4">
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
                <Button
                  variant="secondary"
                  size="sm"
                  className="justify-start"
                  disabled={busy}
                  onClick={reset}
                >
                  <RotateCcw className="size-4" />
                  {t("recept.new")}
                </Button>
              </div>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          {business ? (
            <div className="space-y-4">
              <NagiSettingsPanel businessId={business.id} onTest={() => setTab("chat")} />
              <div className="glass-panel p-5">
                <FaqManager businessId={business.id} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("recept.noBusiness")}</p>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
