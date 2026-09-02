import { AlertCircle, Clock3, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div className="panel space-y-4 p-6" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}

export function ErrorPanel({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="panel flex flex-col items-center gap-3 p-10 text-center">
      <AlertCircle className="size-6 text-destructive" />
      <p className="text-sm font-medium">{t("common.error")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  action,
  icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-12 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      {action}
    </div>
  );
}

export function ComingSoon({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <div className="panel flex flex-col items-center gap-3 p-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
        <Clock3 className="size-5" />
      </div>
      <p className="text-base font-semibold">{t("common.comingSoon")}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{t("common.comingSoonDesc")}</p>
      <p className="eyebrow pt-1">{title}</p>
    </div>
  );
}

export function DemoBadge() {
  const { t } = useI18n();
  return (
    <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
      {t("common.demoData")}
    </span>
  );
}
