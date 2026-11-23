import Link from "next/link";
import { Camera, ChevronRight, Sparkles, Watch } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getGoalOn, getLatestWeight, getProfile } from "@/lib/data";
import { getTimeZone, getToday, requireUser } from "@/lib/auth";
import { aiEnabled, getAiUsage } from "@/lib/ai/usage";
import { formatNumber } from "@/lib/format";
import { Card, Page, PageHeader, SectionTitle, buttonClass } from "@/components/ui";
import { ProfileForm } from "./profile-form";
import { MealSlotsForm } from "./meal-slots-form";
import { mealSlotsOf } from "@/lib/nutrition/meal-slots";
import { GoalForm } from "./goal-form";
import { CoachCard } from "@/components/coach-card";
import { loadCoach } from "@/lib/coach";
import { LanguageSwitch } from "./language-switch";
import { signOut } from "@/app/login/actions";
import { fmt } from "@/lib/i18n";

export default async function SettingsPage() {
  const [{ t, locale }, profile, weight, today, ctx, timeZone] = await Promise.all([
    getI18n(),
    getProfile(),
    getLatestWeight(),
    getToday(),
    requireUser(),
    getTimeZone(),
  ]);
  const { email } = ctx;
  const [goal, coach] = await Promise.all([getGoalOn(today), loadCoach(today, ctx, { profile })]);
  // Without the ai_usage migration the card simply stays hidden.
  const ai = aiEnabled() ? await getAiUsage(ctx, today, timeZone).catch(() => null) : null;
  const eur = (v: number) => `${formatNumber(v, locale, 2)} €`;

  return (
    <Page>
      <PageHeader title={t.settings.title} />
      <div className="space-y-4">
        <Card>
          <SectionTitle>{t.settings.goals}</SectionTitle>
          <GoalForm profile={profile} latestWeightKg={weight?.weight_kg ?? null} goal={goal} today={today} />
        </Card>
        <CoachCard coach={coach} always />
        <Card>
          <SectionTitle>{t.mealSetup.title}</SectionTitle>
          <MealSlotsForm slots={mealSlotsOf(profile)} />
        </Card>
        <Card>
          <SectionTitle>{t.settings.profile}</SectionTitle>
          <ProfileForm profile={profile} />
        </Card>
        <Link href="/settings/garmin" className="block">
          <Card className="flex items-center gap-3 transition hover:bg-surface-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-surface-3">
              <Watch className="size-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{t.garmin.title}</div>
              <div className="text-sm text-muted">{t.health.title}</div>
            </div>
            <ChevronRight className="size-5 text-faint" />
          </Card>
        </Link>
        <Link href="/settings/connect" className="block">
          <Card className="flex items-center gap-3 transition hover:bg-surface-2">
            <div className="grid size-11 place-items-center rounded-2xl bg-surface-3">
              <Sparkles className="size-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{t.connect.title}</div>
              <div className="text-sm text-muted">MCP</div>
            </div>
            <ChevronRight className="size-5 text-faint" />
          </Card>
        </Link>
        <Card className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-3">
            <Camera className="size-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="font-medium">{t.photoMeal.usageTitle}</div>
            <div className="num text-sm text-muted">
              {ai
                ? fmt(t.photoMeal.usage, { month: eur(ai.monthEur), budget: eur(ai.monthlyBudgetEur), today: ai.todayPhotos, limit: ai.dailyPhotoLimit })
                : t.photoMeal.usageOff}
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle>{t.settings.language}</SectionTitle>
          <LanguageSwitch />
        </Card>
        <Card>
          <SectionTitle>{t.settings.account}</SectionTitle>
          {email && <p className="mb-3 text-sm text-muted">{fmt(t.settings.signedInAs, { email })}</p>}
          <form action={signOut}>
            <button className={buttonClass("secondary")} type="submit">
              {t.auth.signOut}
            </button>
          </form>
        </Card>
      </div>
    </Page>
  );
}
