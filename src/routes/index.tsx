import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BellRing,
  CalendarCheck2,
  CalendarClock,
  Car,
  Globe2,
  PhoneIncoming,
  Scissors,
  ShieldCheck,
  Stethoscope,
  UtensilsCrossed,
  Users2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { PublicFooter } from "@/components/public-page";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NAGI AI — AI receptionist for appointment businesses" },
      {
        name: "description",
        content:
          "NAGI AI answers calls, books appointments, and syncs Google Calendar for Japanese salons, clinics, restaurants, and small businesses.",
      },
      { property: "og:title", content: "NAGI AI — AI receptionist" },
      {
        property: "og:description",
        content:
          "AI receptionist platform for Japanese salons, clinics, and appointment-based businesses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

type Line = { who: "caller" | "nagi"; text: string };

const script: Record<"ja" | "en", Line[]> = {
  ja: [
    { who: "caller", text: "明日の午後、カットの予約はできますか？" },
    { who: "nagi", text: "はい、明日は14時と16時が空いております。どちらがよろしいですか？" },
    { who: "caller", text: "14時でお願いします。" },
    { who: "nagi", text: "かしこまりました。明日14時、カットでご予約を承りました。" },
  ],
  en: [
    { who: "caller", text: "Can I book a cut tomorrow afternoon?" },
    { who: "nagi", text: "Of course. We have 2:00 and 4:00 PM open. Which works best?" },
    { who: "caller", text: "2 PM, please." },
    { who: "nagi", text: "Done — you're booked for a cut tomorrow at 2:00 PM." },
  ],
};

function CallSimulator() {
  const { language } = useI18n();
  const [lang, setLang] = useState<"ja" | "en">(language === "en" ? "en" : "ja");
  const [step, setStep] = useState(1);
  const lines = script[lang];

  useEffect(() => setLang(language === "en" ? "en" : "ja"), [language]);
  useEffect(() => {
    setStep(1);
    const id = setInterval(() => setStep((s) => (s >= lines.length + 1 ? 1 : s + 1)), 2200);
    return () => clearInterval(id);
  }, [lang, lines.length]);

  const booked = step > lines.length;

  return (
    <div className="glass-panel relative overflow-hidden p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-ai-indigo text-primary-foreground">
            <span className="absolute inset-0 rounded-full bg-ai-indigo animate-ai-ring" />
            <PhoneIncoming className="relative size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {lang === "ja" ? "着信 · Hair Salon 凪" : "Incoming · Hair Salon Nagi"}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              {lang === "ja" ? "NAGIが応答中" : "NAGI answering"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 rounded-full border border-border bg-background/70 p-0.5 text-xs">
          {(["ja", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {l === "ja" ? "日本語" : "EN"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-10 items-center justify-center gap-1" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="w-1 origin-center rounded-full bg-ai-indigo/70 animate-ai-wave"
            style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 7) * 0.12}s` }}
          />
        ))}
      </div>

      <div className="mt-4 min-h-[220px] space-y-2.5">
        {lines.slice(0, Math.min(step, lines.length)).map((l, i) => (
          <div
            key={`${lang}-${i}`}
            className={cn("flex animate-fade-up", l.who === "nagi" ? "justify-start" : "justify-end")}
          >
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                l.who === "nagi"
                  ? "rounded-bl-sm bg-accent text-accent-foreground"
                  : "rounded-br-sm bg-primary text-primary-foreground",
              )}
            >
              {l.text}
            </p>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm transition-all duration-500",
          booked ? "opacity-100" : "translate-y-1 opacity-0",
        )}
      >
        <CalendarCheck2 className="size-4 shrink-0 text-success" />
        <span className="min-w-0 truncate">
          {lang === "ja" ? "Googleカレンダーに登録・スタッフに通知" : "Added to Google Calendar · Staff notified"}
        </span>
      </div>
    </div>
  );
}

function Landing() {
  const { t, language } = useI18n();
  const ja = language !== "en";
  const [industry, setIndustry] = useState(0);

  const features = [
    { icon: CalendarClock, title: t("landing.f1Title"), desc: t("landing.f1Desc") },
    { icon: Users2, title: t("landing.f2Title"), desc: t("landing.f2Desc") },
    { icon: Globe2, title: t("landing.f3Title"), desc: t("landing.f3Desc") },
    {
      icon: BellRing,
      title: ja ? "スタッフへの通知" : "Staff alerts",
      desc: ja
        ? "予約・キャンセル・人の対応が必要な依頼をすぐにお知らせ。"
        : "Instant alerts for bookings, cancellations, and requests that need a person.",
    },
    {
      icon: ShieldCheck,
      title: ja ? "店舗ごとに安全に分離" : "Private per business",
      desc: ja
        ? "お客様情報や通話記録は各店舗ごとに安全に管理されます。"
        : "Customer data and call history stay private to each business.",
    },
  ];

  const stats = ja
    ? [["24時間", "電話受付"], ["日英", "バイリンガル"], ["即時", "カレンダー連携"], ["0件", "取りこぼし"]]
    : [["24/7", "Call answering"], ["JP / EN", "Bilingual"], ["Instant", "Calendar sync"], ["Zero", "Missed calls"]];

  const industries = [
    {
      icon: Scissors,
      label: ja ? "美容室" : "Salons",
      greet: ja ? "お電話ありがとうございます。ご希望のメニューはございますか？" : "Thanks for calling! Which service would you like?",
      detail: ja ? "メニュー・担当スタッフ・所要時間に合わせて予約" : "Books by service, stylist, and duration",
    },
    {
      icon: Stethoscope,
      label: ja ? "クリニック" : "Clinics",
      greet: ja ? "診療のご予約ですね。初診でいらっしゃいますか？" : "Booking a visit? Is this your first time with us?",
      detail: ja ? "診療時間と休診日を守って空き枠をご案内" : "Respects clinic hours and closed days",
    },
    {
      icon: UtensilsCrossed,
      label: ja ? "飲食店" : "Restaurants",
      greet: ja ? "ご来店人数とご希望のお時間をお伺いします。" : "How many guests, and what time would you like?",
      detail: ja ? "人数と席数を確認してから予約を確定" : "Checks party size and seating before confirming",
    },
    {
      icon: Car,
      label: ja ? "その他" : "Any business",
      greet: ja ? "ご用件をお伺いします。試乗のご予約ですか？" : "How can I help — would you like to book a test drive?",
      detail: ja ? "業種を伝えるだけでAIが受付内容を最適化" : "Describe your business and NAGI adapts",
    },
  ];
  const ind = industries[industry]!;

  const steps = ja
    ? [
        ["お客様が電話", "いつもの店舗番号にお電話。"],
        ["NAGIが対応", "営業時間と空き状況を確認してご案内。"],
        ["予約完了", "カレンダー登録とスタッフ通知まで自動。"],
      ]
    : [
        ["A customer calls", "They dial your usual shop number."],
        ["NAGI answers", "Checks your hours and real availability."],
        ["Booked", "Calendar updated and your staff notified."],
      ];

  return (
    <div className="min-h-screen bg-background washi">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:px-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            凪
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold">NAGI AI</span>
            <span className="text-[11px] text-muted-foreground">AI受付 / Reception</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">{t("landing.ctaSecondary")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("landing.ctaPrimary")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-ai-indigo/25 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <span className="size-1.5 rounded-full bg-vermilion" />
              {t("brand.tagline")}
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-[1.25] tracking-tight whitespace-pre-line md:text-5xl md:leading-[1.2]">
              {t("landing.heroTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("landing.heroDesc")}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("landing.ctaPrimary")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">{t("landing.ctaSecondary")}</Link>
              </Button>
            </div>
          </div>
          <CallSimulator />
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-6">
            {stats.map(([v, l]) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-bold text-ai-indigo md:text-3xl">{v}</p>
                <p className="mt-1 text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <p className="eyebrow">{ja ? "業種に合わせて" : "Built for your industry"}</p>
          <h2 className="mt-3 text-2xl font-bold md:text-3xl">
            {ja ? "どんな受付にも、自然に対応" : "Natural reception for every kind of shop"}
          </h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {industries.map((it, i) => (
              <button
                key={it.label}
                type="button"
                onClick={() => setIndustry(i)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                  industry === i
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <it.icon className="size-4" />
                {it.label}
              </button>
            ))}
          </div>
          <div key={industry} className="panel mt-6 grid animate-fade-up gap-6 p-6 md:grid-cols-[auto_1fr] md:items-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <ind.icon className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-medium">「{ind.greet}」</p>
              <p className="mt-2 text-sm text-muted-foreground">{ind.detail}</p>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/50">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <p className="eyebrow">{ja ? "しくみ" : "How it works"}</p>
            <h2 className="mt-3 text-2xl font-bold md:text-3xl">
              {ja ? "3ステップで予約まで" : "From ring to booking in three steps"}
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {steps.map(([title, desc], i) => (
                <li key={title} className="panel relative p-6">
                  <span className="font-mono text-sm text-vermilion">0{i + 1}</span>
                  <h3 className="mt-3 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="grid gap-5 md:grid-cols-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={cn(
                  "glass-panel p-6 transition-transform duration-300 hover:-translate-y-1",
                  i < 2 ? "md:col-span-3" : "md:col-span-2",
                )}
              >
                <div className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
            <div className="absolute inset-0 opacity-30 ai-grid" aria-hidden />
            <h2 className="relative text-2xl font-bold md:text-3xl">
              {ja ? "電話の取りこぼしを、今日からゼロに。" : "Stop missing calls, starting today."}
            </h2>
            <Button asChild size="lg" variant="secondary" className="relative mt-8">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("landing.ctaPrimary")}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
