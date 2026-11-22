import { BottomNav } from "@/components/bottom-nav";
import { TimeZoneSync } from "@/components/timezone-sync";
import { OfflineSync } from "@/components/offline-sync";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { userId } = await requireUser();
  return (
    <>
      <TimeZoneSync />
      <OfflineSync userId={userId} />
      {children}
      <BottomNav />
    </>
  );
}
