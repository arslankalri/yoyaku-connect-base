import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Globe2, Users2 } from "lucide-react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NAGI AI — AI receptionist for appointment businesses" },
      {
        name: "description",
        content:
          "Manage your salon or clinic profile, opening hours, services, and staff in Japanese or English. AI reception coming next.",
      },
      { property: "og:title", content: "NAGI AI" },
      {
        property: "og:description",
        content:
          "AI receptionist platform for Japanese salons, clinics, and appointment-based businesses.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();

  const features = [
    { icon: CalendarClock, title: t("landing.f1Title"), desc: t("landing.f1Desc") },
    { icon: Users2, title: t("landing.f2Title"), desc: t("landing.f2Desc") },
    { icon: Globe2, title: t("landing.f3Title"), desc: t("landing.f3Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:px-6">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            凪
          </span>
          <div className="flex flex-col leading-tight">
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
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 lg:py-28">
          <p className="eyebrow">{t("brand.tagline")}</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-[1.25] tracking-tight whitespace-pre-line md:text-5xl md:leading-[1.2]">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
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
        </section>

        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 py-16 md:grid-cols-3 md:px-6">
            {features.map((f) => (
              <div key={f.title} className="panel p-6">
                <div className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <p className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground md:px-6">
          {t("landing.footer")}
        </p>
      </footer>
    </div>
  );
}
