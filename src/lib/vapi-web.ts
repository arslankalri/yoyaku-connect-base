export type NagiWebCallStatus = "idle" | "connecting" | "active" | "ending" | "ended";

export type NagiWebCallEvent = {
  type: string;
  [key: string]: unknown;
};

export type NagiWebCallClientOptions = {
  publicKey: string;
  /** Inline transient assistant config, or a Vapi assistant ID string. */
  assistant: Record<string, unknown> | string;
  /** Optional overrides applied when starting by assistant ID (e.g. NAGI tools + server). */
  assistantOverrides?: Record<string, unknown>;
  onStatus?: (status: NagiWebCallStatus) => void;
  onEvent?: (event: NagiWebCallEvent) => void;
  onError?: (error: unknown) => void;
};

type VapiInstance = {
  on: (event: string, handler: (payload?: unknown) => void) => void;
  start: (assistant: unknown, overrides?: unknown) => Promise<unknown>;
  stop: () => void;
};

/**
 * Thin wrapper around the Vapi browser SDK.
 *
 * `@vapi-ai/web` (and its Daily.co dependency) touch browser globals at import
 * time, so the module is loaded lazily inside `start()` — never at module scope.
 * That keeps this file safe to import from an SSR-reachable route module.
 */
export class NagiWebCallClient {
  private readonly options: NagiWebCallClientOptions;
  private vapi: VapiInstance | null = null;
  private status: NagiWebCallStatus = "idle";

  constructor(options: NagiWebCallClientOptions) {
    this.options = options;
  }

  getStatus() {
    return this.status;
  }

  async start(): Promise<void> {
    if (this.status === "connecting" || this.status === "active") return;
    this.setStatus("connecting");

    try {
      await this.ensureMicrophone();
      const vapi = await this.ensureClient();
      const result = await vapi.start(this.options.assistant, this.options.assistantOverrides);
      const callId =
        result && typeof result === "object" && "id" in result
          ? String((result as Record<string, unknown>)["id"])
          : undefined;
      this.options.onEvent?.({ type: "call-start-success", callId });
    } catch (error) {
      this.setStatus("idle");
      this.options.onError?.(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.status !== "active" && this.status !== "connecting") return;
    this.setStatus("ending");

    try {
      this.vapi?.stop();
    } catch (error) {
      this.options.onError?.(error);
    }
  }

  private async ensureMicrophone() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      throw new Error("This browser does not support microphone access.");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      throw new Error("Microphone permission is required. Allow microphone access and try again.");
    }
  }

  private async ensureClient(): Promise<VapiInstance> {
    if (this.vapi) return this.vapi;

    const module = await import("@vapi-ai/web");
    // The package is CommonJS; depending on the bundler the class may be nested under default.default.
    let candidate: unknown = module;
    for (let i = 0; i < 3 && typeof candidate !== "function"; i++) {
      candidate = (candidate as { default?: unknown })?.default;
    }
    if (typeof candidate !== "function")
      throw new Error("Voice library failed to load. Please refresh and try again.");
    const Vapi = candidate as new (key: string) => VapiInstance;
    const vapi = new Vapi(this.options.publicKey);

    vapi.on("call-start", () => {
      this.setStatus("active");
      this.options.onEvent?.({ type: "call-start" });
    });

    vapi.on("call-end", () => {
      this.setStatus("ended");
      this.options.onEvent?.({ type: "call-end" });
    });

    vapi.on("message", (message?: unknown) => {
      this.options.onEvent?.({
        type: "message",
        message: message ?? {},
      });
    });

    vapi.on("error", (error?: unknown) => {
      this.options.onError?.(error);
      this.options.onEvent?.({ type: "error", error });
    });

    this.vapi = vapi;
    return vapi;
  }

  private setStatus(status: NagiWebCallStatus) {
    this.status = status;
    this.options.onStatus?.(status);
  }
}

export function createNagiWebCallClient(options: NagiWebCallClientOptions) {
  return new NagiWebCallClient(options);
}
