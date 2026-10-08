import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { OPERATOR, PublicPage } from "@/components/public-page";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact / お問い合わせ — NAGI AI" },
      { name: "description", content: "Contact NAGI AI by email, phone or WhatsApp for support, partnerships or data requests." },
      { property: "og:title", content: "Contact NAGI AI" },
      { property: "og:description", content: "Reach the NAGI AI team by email, phone or WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { language } = useI18n();
  const ja = language === "ja";
  const cards = [
    { icon: Mail, label: ja ? "メール" : "Email", value: OPERATOR.email, href: `mailto:${OPERATOR.email}` },
    { icon: Phone, label: ja ? "電話" : "Phone", value: OPERATOR.phone, href: `tel:+${OPERATOR.phoneRaw}` },
    { icon: MessageCircle, label: "WhatsApp", value: OPERATOR.phone, href: `https://wa.me/${OPERATOR.phoneRaw}` },
    { icon: MapPin, label: ja ? "所在地" : "Location", value: ja ? OPERATOR.locationJa : OPERATOR.locationEn },
  ];
  return (
    <PublicPage title={ja ? "お問い合わせ" : "Contact us"}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {ja
          ? "サポート、導入のご相談、個人情報に関するご請求は下記までご連絡ください。通常2営業日以内に返信します。"
          : "For support, onboarding questions or personal data requests, reach us below. We usually reply within 2 business days."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const body = (
            <>
              <div className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground"><c.icon className="size-5" /></div>
              <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-sm font-medium break-all">{c.value}</p>
            </>
          );
          return c.href ? (
            <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="glass-panel block p-5 transition-colors hover:border-primary">{body}</a>
          ) : (
            <div key={c.label} className="glass-panel p-5">{body}</div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{ja ? "運営者" : "Operator"}: {OPERATOR.name}</p>
    </PublicPage>
  );
}
