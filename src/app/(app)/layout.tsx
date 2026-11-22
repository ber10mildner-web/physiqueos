import { BottomNav } from "@/components/bottom-nav";
import { TimeZoneSync } from "@/components/timezone-sync";
import { OfflineSync } from "@/components/offline-sync";
import { MealsProvider } from "@/components/meals-context";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { mealSlotsOf } from "@/lib/nutrition/meal-slots";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [{ userId }, profile] = await Promise.all([requireUser(), getProfile()]);
  return (
    <MealsProvider slots={mealSlotsOf(profile)}>
      <TimeZoneSync />
      <OfflineSync userId={userId} />
      {children}
      <BottomNav />
    </MealsProvider>
  );
}
