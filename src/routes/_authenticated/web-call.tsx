import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, PhoneCall } from "lucide-react";

import { NagiWebCall } from "@/components/nagi-web-call";
import { AppShell } from "@/components/app-shell";
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
    ],
  }),
  component: WebCallPage,
});

function WebCallPage() {
  return (
    <AppShell
      title="NAGI Web Call"
      description="Test the NAGI receptionist from your browser before connecting a phone number."
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="glass-panel p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-ai-indigo/25 bg-ai-indigo/10 text-ai-indigo">
              <PhoneCall className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Browser voice test</h2>
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
            View call history
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
