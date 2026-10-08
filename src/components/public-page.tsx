import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

export function PublicFooter() {
  const { language } = useI18n();
  const ja = language === "ja";
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 text-xs text-muted-foreground md:px-6">
        <span>© {new Date().getFullYear()} NAGI AI</span>
        <Link to="/terms" className="hover:text-foreground">{ja ? "利用規約" : "Terms of Service"}</Link>
        <Link to="/privacy" className="hover:text-foreground">{ja ? "プライバシーポリシー" : "Privacy Policy"}</Link>
        <Link to="/contact" className="hover:text-foreground">{ja ? "お問い合わせ" : "Contact"}</Link>
      </div>
    </footer>
  );
}

export function PublicPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">凪</span>
            <span className="text-sm font-semibold">NAGI AI</span>
          </Link>
          <div className="ml-auto"><LanguageToggle /></div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted-foreground">{updated}</p>}
        <div className="mt-8 space-y-8">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}

export type Section = { h: string; p: string[] };

export function Sections({ items }: { items: Section[] }) {
  return (
    <>
      {items.map((s) => (
        <section key={s.h}>
          <h2 className="text-lg font-semibold">{s.h}</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {s.p.map((x) => <p key={x}>{x}</p>)}
          </div>
        </section>
      ))}
    </>
  );
}

export const OPERATOR = {
  name: "Muhammad Arslan",
  email: "arslankalri@gmail.com",
  phone: "+81 80-6351-3651",
  phoneRaw: "818063513651",
  locationJa: "宮城県大崎市",
  locationEn: "Osaki City, Miyagi, Japan",
};
