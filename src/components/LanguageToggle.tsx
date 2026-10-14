import { useI18n, type Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const options: { value: Language; labelKey: string }[] = [
  { value: "ja", labelKey: "lang.japanese" },
  { value: "en", labelKey: "lang.english" },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("settings.language")}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border border-border bg-secondary/60 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = language === option.value;
        return (
          <Button
            variant="ghost"
            size="sm"
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => setLanguage(option.value)}
            className={cn(
              "h-7 whitespace-nowrap rounded-sm px-2 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(option.labelKey)}
          </Button>
        );
      })}
    </div>
  );
}
