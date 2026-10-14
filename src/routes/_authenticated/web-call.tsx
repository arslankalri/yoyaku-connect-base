import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, PhoneCall } from "lucide-react";

import { NagiWebCall } from "@/components/nagi-web-call";
import { AppShell } from "@/components/app-shell";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/web-call")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "NAGI Web Call" },
      {
        name: "description",
        content: "Talk to your NAGI AI receptionist directly from your browser.",
      },
      { property: "og:title", content: "NAGI Web Call — NAGI AI" },
      {
        property: "og:description",
        content: "Talk to your business receptionist from your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WebCallPage,
});

function WebCallPage() {
  const { language } = useI18n();
  const ja = language === "ja";
  return (
    <AppShell
      title={ja ? "NAGI ウェブ通話" : "NAGI Web Call"}
      description={
        ja ? "ブラウザからNAGI受付に通話" : "Talk to your NAGI receptionist from your browser."
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="section-layout py-2">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-ai-indigo/25 bg-ai-indigo/10 text-ai-indigo">
              <PhoneCall className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">
                {ja ? "ブラウザ通話" : "Browser voice call"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browser microphone → Vapi → NAGI. NAGI remains the business brain and source of
                truth.
              </p>
            </div>
          </div>
        </div>

        <NagiWebCall />

        <Button asChild variant="outline">
          <Link to="/calls">
            <ArrowLeft className="size-4" />
            {ja ? "通話履歴を見る" : "View call history"}
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
