import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Clock3, Copy, MessagesSquare, PhoneCall, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, ErrorPanel, LoadingPanel } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBusiness, useConversations, useDeleteConversation, useRealtime } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/calls")({
  head: () => ({
    meta: [
      { title: "Conversation History / 通話履歴 — NAGI AI" },
      {
        name: "description",
        content: "Live transcripts of the conversations NAGI had with your customers.",
      },
      { property: "og:title", content: "Conversation History / 通話履歴 — NAGI AI" },
      { property: "og:description", content: "Review every NAGI conversation and transcript." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CallsPage,
});

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds < 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? minutes + "m " + remainder + "s" : remainder + "s";
}

function CallsPage() {
  const { t, language } = useI18n();
  const businessQuery = useBusiness();
  const business = businessQuery.data;
  const conversationsQuery = useConversations(business?.id);
  const deleteMutation = useDeleteConversation();
  useRealtime(business?.id, [{ table: "calls", queryKey: "conversations" }]);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (businessQuery.isLoading) {
    return (
      <AppShell title={t("conv.title")}>
        <LoadingPanel rows={4} />
      </AppShell>
    );
  }

  if (businessQuery.isError) {
    return (
      <AppShell title={t("conv.title")}>
        <ErrorPanel onRetry={() => businessQuery.refetch()} />
      </AppShell>
    );
  }

  if (!business) return <Navigate to="/onboarding" replace />;

  const locale = language === "ja" ? "ja-JP" : "en-US";
  const rows = conversationsQuery.data ?? [];

  return (
    <AppShell title={t("conv.title")} description={t("conv.desc")}>
      {conversationsQuery.isLoading ? (
        <LoadingPanel rows={4} />
      ) : conversationsQuery.isError ? (
        <ErrorPanel onRetry={() => conversationsQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("conv.empty")} icon={<MessagesSquare className="size-5" />} />
      ) : (
        <ul className="space-y-3">
          {rows.map((conversation) => {
            const isOpen = expanded === conversation.id;
            const started = conversation.started_at ?? conversation.created_at;
            const isWeb = conversation.channel === "web";

            return (
              <li key={conversation.id} className="glass-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <Badge variant="outline" className="gap-1.5">
                        {isWeb || conversation.channel === "voice" ? (
                          <PhoneCall className="size-3.5" />
                        ) : (
                          <MessagesSquare className="size-3.5" />
                        )}
                        {isWeb
                          ? "Web call"
                          : t(
                              "conv.channel." +
                                (conversation.channel === "voice" ? "voice" : "chat"),
                            )}
                      </Badge>

                      <Badge
                        variant={conversation.status === "completed" ? "secondary" : "outline"}
                      >
                        {conversation.status ?? "unknown"}
                      </Badge>

                      <span className="font-normal text-muted-foreground">
                        {new Intl.DateTimeFormat(locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(started))}
                      </span>
                    </div>

                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        <span>{formatDuration(conversation.duration_seconds)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">From:</span>{" "}
                        {conversation.from_number ?? (isWeb ? "Browser" : "Unknown")}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">To:</span>{" "}
                        {conversation.to_number ?? (isWeb ? "NAGI Web" : "Unknown")}
                      </div>
                    </div>

                    {conversation.summary && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {conversation.summary}
                      </p>
                    )}

                    {conversation.session_key && (
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        Call ID: {conversation.session_key}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpanded(isOpen ? null : conversation.id)}
                    >
                      {isOpen ? "Hide details" : "Call details"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("common.delete")}
                      onClick={async () => {
                        try {
                          await deleteMutation.mutateAsync(conversation.id);
                          toast.success(t("conv.deleted"));
                        } catch {
                          toast.error(t("common.error"));
                        }
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
                        <p className="text-muted-foreground">Direction</p>
                        <p className="mt-1 font-medium">{conversation.direction}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-secondary/30 p-3">
                        <p className="text-muted-foreground">Duration</p>
                        <p className="mt-1 font-medium">
                          {formatDuration(conversation.duration_seconds)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">Transcript</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!conversation.transcript}
                          onClick={async () => {
                            if (!conversation.transcript) return;
                            await navigator.clipboard.writeText(conversation.transcript);
                            toast.success("Transcript copied");
                          }}
                        >
                          <Copy className="size-3.5" />
                          Copy
                        </Button>
                      </div>

                      <pre className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed">
                        {conversation.transcript ?? "No transcript recorded."}
                      </pre>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
