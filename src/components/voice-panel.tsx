import { useEffect, useState } from "react";
import { PhoneCall } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import { useNagiSettings, useSaveNagiSettings } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/** Owner-facing setup for the NAGI phone line (Twilio number + greeting). */
export function VoicePanel({ businessId }: { businessId: string }) {
  const { language } = useI18n();
  const ja = language === "ja";
  const settings = useNagiSettings(businessId);
  const save = useSaveNagiSettings(businessId);

  const [enabled, setEnabled] = useState(false);
  const [number, setNumber] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (!settings.data) return;
    setEnabled(settings.data.voice_enabled);
    setNumber(settings.data.voice_phone_number ?? "");
    setGreeting(settings.data.voice_greeting ?? "");
  }, [settings.data]);

  if (settings.isLoading) return <LoadingPanel />;
  if (settings.isError) return <ErrorPanel onRetry={() => settings.refetch()} />;

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function onSave() {
    try {
      await save.mutateAsync({
        voice_enabled: enabled,
        voice_phone_number: number.trim() || null,
        voice_greeting: greeting,
      });
      toast.success(ja ? "保存しました" : "Saved");
    } catch {
      toast.error(ja ? "保存できませんでした" : "Could not save");
    }
  }

  return (
    <div className="glass-panel space-y-6 p-6">
      <div className="flex items-start gap-3">
        <span
          className="glow-border grid size-9 shrink-0 place-items-center rounded-xl text-primary-foreground"
          style={{ backgroundImage: "var(--gradient-ai)" }}
        >
          <PhoneCall className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">
            {ja ? "電話でのAI受付" : "AI reception by phone"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ja
              ? "お店の電話番号にかかってきた電話にナギが応対し、会話の内容は通話履歴に保存されます。"
              : "NAGI answers calls to your phone number, and every conversation is saved to your call history."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
        <div>
          <p className="text-sm font-medium">
            {ja ? "電話応対を有効にする" : "Answer phone calls"}
          </p>
          <p className="text-xs text-muted-foreground">
            {ja ? "オフの間、電話には応対しません。" : "While off, calls are not answered."}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice-number">{ja ? "受付する電話番号" : "Phone number to answer"}</Label>
        <Input
          id="voice-number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+81 3 1234 5678"
        />
        <p className="text-xs text-muted-foreground">
          {ja
            ? "国番号から入力してください（例: +81…）。"
            : "Include the country code (for example +81…)."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voice-greeting">{ja ? "最初のあいさつ" : "Opening greeting"}</Label>
        <Textarea
          id="voice-greeting"
          rows={3}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder={
            ja
              ? "お電話ありがとうございます。〇〇のAI受付、ナギです。"
              : "Thank you for calling. This is NAGI, the AI receptionist."
          }
        />
        <p className="text-xs text-muted-foreground">
          {ja
            ? "空欄の場合は店名を使った案内を自動で読み上げます。"
            : "Left empty, NAGI greets callers using your shop name."}
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="font-medium">{ja ? "電話会社側の設定" : "Set this on your phone provider"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {ja
            ? "着信時のリンク（POST）に貼り付けてください。"
            : "Paste this as the incoming-call webhook (POST)."}
        </p>
        <code className="mt-2 block break-all rounded-lg bg-background/70 p-2 text-xs">
          {origin}/api/public/voice/incoming
        </code>
        <p className="mt-2 text-xs text-muted-foreground">
          {ja ? "通話終了時のリンク:" : "Call-status webhook:"}
        </p>
        <code className="mt-1 block break-all rounded-lg bg-background/70 p-2 text-xs">
          {origin}/api/public/voice/status
        </code>
      </div>

      <Button onClick={onSave} disabled={save.isPending}>
        {ja ? "保存" : "Save"}
      </Button>
    </div>
  );
}
