import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Log in / ログイン — NAGI AI" },
      {
        name: "description",
        content:
          "Log in or create your NAGI AI account to manage your business, services, and staff.",
      },
      { property: "og:title", content: "Log in — NAGI AI" },
      { property: "og:description", content: "Access your NAGI AI business dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(initialMode ?? "login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (mode === "signup" && fullName.trim().length === 0) return t("auth.errNameRequired");
    if (!z.string().email().safeParse(email.trim()).success) return t("auth.errInvalidEmail");
    if (password.length < 8) return t("auth.errPasswordShort");
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (!data.session) {
          setNotice(t("auth.checkEmail"));
          return;
        }
        navigate({ to: "/dashboard" });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(
            signInError.message.toLowerCase().includes("invalid")
              ? t("auth.errInvalidCredentials")
              : signInError.message,
          );
          return;
        }
        toast.success(t("auth.loginCta"));
        navigate({ to: "/dashboard" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <header className="flex h-16 items-center px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            凪
          </span>
          <span className="text-sm font-semibold">NAGI AI</span>
        </Link>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 md:items-center md:pt-0">
        <div className="glass-panel w-full max-w-md p-7">
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("brand.tagline")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  maxLength={100}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
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
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                maxLength={72}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? t("common.loading")
                : mode === "login"
                  ? t("auth.loginCta")
                  : t("auth.signupCta")}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("auth.or")}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={submitting}
            onClick={onGuestLogin}
          >
            {t("auth.guestCta")}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("auth.guestHint")}</p>

          <div className="mt-5 flex flex-col gap-2 text-sm">
            <Link to="/forgot-password" className="text-primary hover:underline">
              {t("auth.forgotPassword")}
            </Link>
            <p className="text-muted-foreground">
              {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                  setNotice(null);
                }}
              >
                {mode === "login" ? t("auth.signup") : t("auth.login")}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
