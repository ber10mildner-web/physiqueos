import Link from "next/link";
import { ChevronRight, Sparkles, Watch } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getGoalOn, getLatestWeight, getProfile } from "@/lib/data";
import { getToday, requireUser } from "@/lib/auth";
import { Card, Page, PageHeader, SectionTitle, buttonClass } from "@/components/ui";
import { ProfileForm } from "./profile-form";
import { GoalForm } from "./goal-form";
import { LanguageSwitch } from "./language-switch";
import { signOut } from "@/app/login/actions";
import { fmt } from "@/lib/i18n";

export default async function SettingsPage() {
  const [{ t }, profile, weight, today, { email }] = await Promise.all([
    getI18n(),
    getProfile(),
    getLatestWeight(),
    getToday(),
    requireUser(),
  ]);
  const goal = await getGoalOn(today);

  return (
    <Page>
      <PageHeader title={t.settings.title} />
      <div className="space-y-4">
        <Card>
          <SectionTitle>{t.settings.goals}</SectionTitle>
          <GoalForm profile={profile} latestWeightKg={weight?.weight_kg ?? null} goal={goal} today={today} />
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
