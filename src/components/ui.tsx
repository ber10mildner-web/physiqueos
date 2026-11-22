import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cx(
        "mx-auto w-full max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3 pt-2">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
            ← {back.label}
          </Link>
        )}
        <h1 className="truncate text-[28px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section className={cx("animate-fade-up rounded-3xl border border-line bg-surface p-4", className)} style={style}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-105 active:brightness-95",
  secondary: "bg-surface-2 text-text border border-line hover:bg-surface-3",
  ghost: "text-muted hover:text-text hover:bg-surface-2",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

export function buttonClass(variant: Variant = "primary", size: "md" | "sm" = "md") {
  return cx(
    "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    size === "md" ? "h-12 px-5 text-[15px]" : "h-9 px-3 text-sm",
    variants[variant],
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm" }) {
  return <button className={cx(buttonClass(variant, size), className)} {...props} />;
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-[16px] text-text placeholder:text-faint outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, "appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[13px] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function ProgressBar({ value, max, color = "var(--accent)", className }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: over ? "var(--danger)" : color }}
      />
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "border-line bg-surface-2 text-muted",
    warn: "border-warn/30 bg-warn/10 text-warn",
    error: "border-danger/30 bg-danger/10 text-danger",
    success: "border-accent/30 bg-accent/10 text-accent",
  };
  return <div className={cx("rounded-2xl border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}
