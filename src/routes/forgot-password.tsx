import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Password reset / パスワード再設定 — Yoyaku AI" },
      {
        name: "description",
        content: "Request a password reset link for your Yoyaku AI account.",
      },
      { property: "og:title", content: "Password reset — Yoyaku AI" },
      { property: "og:description", content: "Request a Yoyaku AI password reset link." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!z.string().email().safeParse(email.trim()).success) {
      setError(t("auth.errInvalidEmail"));
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <header className="flex h-16 items-center px-4 md:px-8">
        <Link to="/" className="text-sm font-semibold">
          Yoyaku AI
        </Link>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 md:items-center md:pt-0">
        <div className="panel w-full max-w-md p-7">
          <h1 className="text-xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.resetDesc")}</p>

          {sent ? (
            <p className="mt-6 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
              {t("auth.resetSent")}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("common.loading") : t("auth.resetSend")}
              </Button>
            </form>
          )}

          <div className="mt-5">
            <Link to="/auth" className="text-sm text-primary hover:underline">
              {t("auth.backToLogin")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
