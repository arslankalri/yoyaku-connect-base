import { Navigate, createFileRoute } from "@tanstack/react-router";
import { MessagesSquare, Trash2 } from "lucide-react";
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
            return (
              <li key={conversation.id} className="glass-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Badge variant="outline">
                        {t(`conv.channel.${conversation.channel === "voice" ? "voice" : "chat"}`)}
                      </Badge>
                      {new Intl.DateTimeFormat(locale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(conversation.started_at ?? conversation.created_at))}
                    </p>
                    {conversation.summary && (
                      <p className="text-xs text-muted-foreground">{conversation.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpanded(isOpen ? null : conversation.id)}
                    >
                      {t("conv.transcript")}
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
                  <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed">
                    {conversation.transcript ?? "—"}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
