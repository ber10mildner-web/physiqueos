export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="#121418" stroke="#262a31" />
      <path d="M20 17h24v7H30.5l9 8-9 8H44v7H20v-6.5L30 32l-10-8.5z" fill="#c8f560" />
    </svg>
  );
}
