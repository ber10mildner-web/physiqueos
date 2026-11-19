import { BottomNav } from "@/components/bottom-nav";
import { TimeZoneSync } from "@/components/timezone-sync";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TimeZoneSync />
      {children}
      <BottomNav />
    </>
  );
}
