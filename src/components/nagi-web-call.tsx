import { Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createNagiWebCallClient, type NagiWebCallEvent, type NagiWebCallStatus } from "@/lib/vapi-web";

type Props = {
  className?: string;
};

function publicVapiKey() {
  return (
    import.meta.env.VITE_VAPI_PUBLIC_KEY ??
    import.meta.env.VITE_VAPI_PUBLIC_API_KEY ??
    ""
  );
}

function assistantId() {
  return import.meta.env.VITE_VAPI_WEB_ASSISTANT_ID ?? "";
}

export function NagiWebCall({ className }: Props) {
  const [status, setStatus] = useState<NagiWebCallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>("");

  const clientRef = useRef<ReturnType<typeof createNagiWebCallClient> | null>(null);

  useEffect(() => {
    const key = publicVapiKey();
    const id = assistantId();
    if (!key || !id) return;

    clientRef.current = createNagiWebCallClient({
      publicKey: key,
      assistantId: id,
      onStatus: setStatus,
      onError: (value) => {
        setError(value instanceof Error ? value.message : "Vapi web call failed");
      },
      onEvent: (event: NagiWebCallEvent) => {
        setLastEvent(event.type);
      },
    });

    return () => {
      void clientRef.current?.stop().catch(() => undefined);
      clientRef.current = null;
    };
  }, []);

  async function start() {
    setError(null);

    const key = publicVapiKey();
    const id = assistantId();
    if (!key || !id) {
      setError("Set VITE_VAPI_PUBLIC_KEY and VITE_VAPI_WEB_ASSISTANT_ID first.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("You must be logged in.");
      return;
    }

    try {
      if (!clientRef.current) {
        clientRef.current = createNagiWebCallClient({
          publicKey: key,
          assistantId: id,
          onStatus: setStatus,
          onError: (value) => {
            setError(value instanceof Error ? value.message : "Vapi web call failed");
          },
          onEvent: (event) => setLastEvent(event.type),
        });
      }

      await clientRef.current.start();
    } catch {
      // Detailed error is set by the client event handler.
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
          <p className="mt-1 text-xs text-muted-foreground">
            Browser microphone → Vapi → NAGI
          </p>
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

      {lastEvent && (
        <p className="mt-3 text-[11px] text-muted-foreground">Last event: {lastEvent}</p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
