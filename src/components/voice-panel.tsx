import { useEffect, useState } from "react";
import { Copy, KeyRound, PhoneCall, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ErrorPanel, LoadingPanel } from "@/components/states";
import {
  useBusinessApiKeys,
  useCreateBusinessApiKey,
  useNagiSettings,
  useRevokeBusinessApiKey,
  useSaveNagiSettings,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function CopyRow({ value, label }: { value: string; label?: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="block flex-1 break-all rounded-lg bg-background/70 p-2 text-xs">
        {value}
      </code>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={label ?? "Copy"}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success(label ?? "Copied");
        }}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

/** Owner-facing setup for the NAGI phone line (voice agent connection + greeting). */
export function VoicePanel({ businessId }: { businessId: string }) {
  const { language } = useI18n();
  const ja = language === "ja";
  const settings = useNagiSettings(businessId);
  const save = useSaveNagiSettings(businessId);
  const keys = useBusinessApiKeys(businessId);
  const createKey = useCreateBusinessApiKey(businessId);
  const revokeKey = useRevokeBusinessApiKey();

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
  const webhook = `${origin}/api/public/agent/vapi`;
  const activeKey = keys.data?.[0]?.api_key ?? "";

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
            ? "国番号から入力してください（例: +81…）。番号はあとから追加できます。"
            : "Include the country code (for example +81…). You can add the number later."}
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

      <Button onClick={onSave} disabled={save.isPending}>
        {ja ? "保存" : "Save"}
      </Button>

      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <p className="font-medium">{ja ? "通話サービスとの接続" : "Connect your calling service"}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {ja
            ? "Vapi でアシスタントを作成し、下のリンクと接続キーを貼り付けてください。ナギがお店の営業時間・メニュー・料金・空き状況を使って応対します。"
            : "Create an assistant in Vapi, then paste the link and connection key below. NAGI answers using your real hours, menu, prices and availability."}
        </p>

        <div>
          <p className="text-xs font-medium">{ja ? "リンク（Server URL）" : "Link (Server URL)"}</p>
          <CopyRow value={webhook} label={ja ? "コピーしました" : "Copied"} />
        </div>

        <div>
          <p className="text-xs font-medium">{ja ? "接続キー（Secret）" : "Connection key (Secret)"}</p>
          {activeKey ? (
            <>
              <CopyRow value={activeKey} label={ja ? "コピーしました" : "Copied"} />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={createKey.isPending}
                  onClick={() => {
                    createKey
                      .mutateAsync(undefined)
                      .then(() => toast.success(ja ? "新しいキーを作成しました" : "New key created"))
                      .catch(() =>
                        toast.error(ja ? "作成できませんでした" : "Could not create a key"),
                      );
                  }}
                >
                  {ja ? "新しいキーを作成" : "Create new key"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={revokeKey.isPending}
                  onClick={() => {
                    const id = keys.data?.[0]?.id;
                    if (!id) return;
                    revokeKey
                      .mutateAsync(id)
                      .then(() => toast.success(ja ? "無効にしました" : "Key disabled"))
                      .catch(() => toast.error(ja ? "変更できませんでした" : "Could not update"));
                  }}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  {ja ? "このキーを無効にする" : "Disable this key"}
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              className="mt-2"
              size="sm"
              disabled={createKey.isPending}
              onClick={() => {
                createKey
                  .mutateAsync(undefined)
                  .then(() => toast.success(ja ? "キーを作成しました" : "Key created"))
                  .catch(() => toast.error(ja ? "作成できませんでした" : "Could not create a key"));
              }}
            >
              {ja ? "接続キーを作成" : "Create connection key"}
            </Button>
          )}
        </div>

        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>
            {ja
              ? "Vapi で電話番号を取得し、着信を「Assistant Request」に設定します。"
              : "Get a phone number in Vapi and set inbound calls to use an Assistant Request."}
          </li>
          <li>
            {ja
              ? "上のリンクを Server URL に、接続キーを Server Secret に貼り付けます。"
              : "Paste the link above as the Server URL and the key as the Server Secret."}
          </li>
          <li>
            {ja
              ? "電話をかけて確認します。会話は通話履歴に保存されます。"
              : "Call the number to test. Every conversation appears in your call history."}
          </li>
        </ol>
      </div>
    </div>
  );
}
