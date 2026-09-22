import { Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createNagiWebCallClient, type NagiWebCallEvent, type NagiWebCallStatus } from "@/lib/vapi-web";

type Props = { className?: string };

type WebCallConfig = {
  publicKey: string;
  assistant: Record<string, unknown>;
  expiresAt: number;
};

export function NagiWebCall({ className }: Props) {
  const [status, setStatus] = useState<NagiWebCallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>("");
  const [config, setConfig] = useState<WebCallConfig | null>(null);
  const clientRef = useRef<ReturnType<typeof createNagiWebCallClient> | null>(null);

  useEffect(() => {
    return () => {
      void clientRef.current?.stop().catch(() => undefined);
      clientRef.current = null;
    };
  }, []);

  async function start() {
    setError(null);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError("You must be logged in.");
      return;
    }

    try {
      const response = await fetch("/api/voice/web-config", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
      const payload = (await response.json()) as Partial<WebCallConfig> & { error?: string };
      if (!response.ok || !payload.publicKey || !payload.assistant) {
        throw new Error(payload.error ?? "Unable to configure NAGI web calling");
      }

      const nextConfig: WebCallConfig = {
        publicKey: payload.publicKey,
        assistant: payload.assistant,
        expiresAt: payload.expiresAt ?? 0,
      };
      setConfig(nextConfig);

      clientRef.current = createNagiWebCallClient({
        publicKey: nextConfig.publicKey,
        assistant: nextConfig.assistant,
        onStatus: setStatus,
        onError: (value) => {
          setError(value instanceof Error ? value.message : "Vapi web call failed");
        },
        onEvent: (event: NagiWebCallEvent) => {
          setLastEvent(event.type);
        },
      });

      await clientRef.current.start();
    } catch (value) {
      setStatus("idle");
      setError(value instanceof Error ? value.message : "Unable to start NAGI web call");
    }
  }

  async function stop() {
    await clientRef.current?.stop().catch(() => undefined);
  }

  const active = status === "active" || status === "connecting";

  return (
    <section className={className ?? "glass-panel p-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">NAGI Web Call</p>
          <p className="mt-1 text-xs text-muted-foreground">Browser microphone → Vapi → NAGI</p>
        </div>
        <Badge variant={active ? "default" : "outline"}>{status}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!active ? (
          <Button type="button" onClick={() => void start()}>
            <Phone className="size-4" />
            Start web call
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={() => void stop()}>
            <PhoneOff className="size-4" />
            End call
          </Button>
        )}
      </div>

      {config?.expiresAt ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Secure session expires {new Date(config.expiresAt * 1000).toLocaleTimeString()}.
        </p>
      ) : null}

      {lastEvent ? (
        <p className="mt-3 text-[11px] text-muted-foreground">Last event: {lastEvent}</p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
