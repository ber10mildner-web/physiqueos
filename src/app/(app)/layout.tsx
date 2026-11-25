import { BottomNav } from "@/components/bottom-nav";
import { TimeZoneSync } from "@/components/timezone-sync";
import { OfflineSync } from "@/components/offline-sync";
import { MealsProvider } from "@/components/meals-context";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { mealSlotsOf } from "@/lib/nutrition/meal-slots";
import { getI18n } from "@/lib/i18n/server";
import { Splash } from "@/components/splash";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [{ userId }, profile, { t }] = await Promise.all([requireUser(), getProfile(), getI18n()]);
  return (
    <MealsProvider slots={mealSlotsOf(profile)}>
      <Splash slogan={t.splash.slogan} />
      <TimeZoneSync />
      <OfflineSync userId={userId} />
      {children}
      <BottomNav />
    </MealsProvider>
  );
}
