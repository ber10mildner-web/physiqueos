"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Apple, Activity, Dumbbell, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cx } from "./ui";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = [
    { href: "/", label: t.nav.dashboard, icon: Home, active: pathname === "/" },
    { href: "/nutrition", label: t.nav.nutrition, icon: Apple, active: pathname.startsWith("/nutrition") },
    { href: "/training", label: t.nav.training, icon: Dumbbell, active: pathname.startsWith("/training") },
    { href: "/body", label: t.nav.body, icon: Activity, active: pathname.startsWith("/body") },
    { href: "/settings", label: t.nav.settings, icon: UserRound, active: pathname.startsWith("/settings") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ href, label, icon: Icon, active }) => (
          <li key={href}>
            <Link
              href={href}
              className={cx(
                "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-text" : "text-faint hover:text-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cx("size-[22px]", active && "text-accent")} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
