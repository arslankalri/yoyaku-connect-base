import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  PhoneCall,
  PhoneIncoming,
  Scissors,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AIBackground, OnlineDot } from "@/components/ai-background";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

type NavItem = { to: string; labelKey: string; icon: typeof LayoutDashboard; soon?: boolean };

const mainNav: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/ai-receptionist", labelKey: "nav.receptionist", icon: PhoneIncoming },
  { to: "/appointments", labelKey: "nav.appointments", icon: ClipboardList, soon: true },
  { to: "/calendar", labelKey: "nav.calendar", icon: CalendarDays, soon: true },
  { to: "/customers", labelKey: "nav.customers", icon: Users, soon: true },
  { to: "/calls", labelKey: "nav.calls", icon: PhoneCall, soon: true },
];

const setupNav: NavItem[] = [
  { to: "/services", labelKey: "nav.services", icon: Scissors },
  { to: "/staff", labelKey: "nav.staff", icon: UsersRound },
  { to: "/faq", labelKey: "nav.faq", icon: HelpCircle },
  { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3, soon: true },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

function BrandMark() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="glow-border grid size-9 place-items-center rounded-xl text-sm font-semibold text-primary-foreground"
        style={{ backgroundImage: "var(--gradient-ai)" }}
      >
        凪
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">{t("brand.name")}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <OnlineDot />
          AI受付 / AI Reception
        </span>
      </span>
    </div>
  );
}

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <p className="eyebrow px-3 pb-1">{title}</p>
      {items.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border border-ai-indigo/25 bg-ai-indigo/10 font-medium text-foreground shadow-[0_0_20px_-8px_var(--ai-indigo)]"
                : "border border-transparent text-muted-foreground hover:border-ai-indigo/15 hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{t(item.labelKey)}</span>
            {item.soon && (
              <span className="ml-auto rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {t("common.comingSoon")}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function NavBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const { t } = useI18n();
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <NavSection
        title={t("nav.section.main")}
        items={mainNav}
        pathname={pathname}
        onNavigate={onNavigate}
      />
      <NavSection
        title={t("nav.section.setup")}
        items={setupNav}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    </nav>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <AIBackground />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <BrandMark />
        </div>
        <NavBody pathname={pathname} />
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            {t("common.signOut")}
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label={t("nav.menu")}
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar/95 p-0 backdrop-blur-xl">
              <SheetTitle className="flex h-16 items-center border-b border-sidebar-border px-5">
                <BrandMark />
              </SheetTitle>
              <div className="flex h-[calc(100%-4rem)] flex-col">
                <NavBody pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                <div className="border-t border-sidebar-border p-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2.5 text-muted-foreground"
                    onClick={handleSignOut}
                  >
                    <LogOut className="size-4" />
                    {t("common.signOut")}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <BrandMark />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 lg:py-10">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight md:text-[27px]">{title}</h1>
              {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
