import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importBusinessFromWeb } from "@/lib/business-import.functions";
import { useI18n } from "@/lib/i18n";

type Result = { name: string; hours: number; services: number; faqs: number; missing: string[] };

export function SmartImport({
  businessType,
  onImported,
}: {
  businessType?: string | null | undefined;
  onImported?: () => void;
}) {
  const { language } = useI18n();
  const ja = language === "ja";
  const run = useServerFn(importBusinessFromWeb);
  const qc = useQueryClient();
  const [website, setWebsite] = useState("");
  const [maps, setMaps] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function go() {
    setBusy(true);
    setResult(null);
    try {
      const r = await run({
        data: {
          ...(website.trim() ? { websiteUrl: website.trim() } : {}),
          ...(maps.trim() ? { mapsUrl: maps.trim() } : {}),
          businessType: businessType ?? null,
        },
      });
      if (!r.ok) {
        toast.error(
          r.error === "INVALID_URL"
            ? ja ? "URLが正しくありません" : "That link doesn't look valid."
            : r.error === "UNREACHABLE"
              ? ja ? "ページを読み込めませんでした" : "Couldn't open that page."
              : ja ? "情報を取得できませんでした" : "Couldn't read business info.",
        );
        return;
      }
      setResult(r);
      await qc.invalidateQueries();
      onImported?.();
    } catch {
      toast.error(ja ? "エラーが発生しました" : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-ai-indigo/40 bg-ai-indigo/5 p-4 space-y-3">
      <div>
        <p className="font-semibold">✨ {ja ? "スマート自動入力" : "Smart auto-fill"}</p>
        <p className="text-xs text-muted-foreground">
          {ja
            ? "ホームページやGoogleマップのURLを貼るだけで、店舗情報・営業時間・メニュー・よくある質問をAIが自動で入力します。"
            : "Paste your website or Google Maps link and AI fills in your details, hours, menu and FAQs."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">{ja ? "ホームページURL" : "Website URL"}</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label className="text-xs">{ja ? "GoogleマップURL" : "Google Maps link"}</Label>
          <Input value={maps} onChange={(e) => setMaps(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
        </div>
      </div>
      <Button onClick={go} disabled={busy || (!website.trim() && !maps.trim())}>
        {busy ? (ja ? "読み込み中…（最大1分）" : "Reading… (up to a minute)") : ja ? "自動入力する" : "Auto-fill"}
      </Button>
      {result && (
        <div className="text-sm space-y-1">
          <p className="text-success">
            ✓ {result.name}: {ja ? "営業日" : "open days"} {result.hours} / {ja ? "メニュー" : "services"}{" "}
            {result.services} / FAQ {result.faqs}
          </p>
          {result.missing.length > 0 && (
            <p className="text-muted-foreground">
              {ja ? "見つからなかった情報（次の画面で入力してください）：" : "Not found — please fill in next: "}
              {result.missing.join("、")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
