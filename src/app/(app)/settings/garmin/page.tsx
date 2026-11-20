import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { isGarminKeyConfigured } from "@/lib/garmin/crypto";
import { Card, Notice, Page, PageHeader, SectionTitle } from "@/components/ui";
import { GarminConnectForm, GarminStatus } from "./garmin-form";

export default async function GarminPage() {
  const { t } = await getI18n();
  const { supabase, userId } = await requireUser();
  const { data: conn } = await supabase
    .from("garmin_connections")
    .select("display_name, status, last_error, last_sync_at")
    .eq("user_id", userId)
    .maybeSingle();
  const configured = isAdminConfigured() && isGarminKeyConfigured();
  return (
    <Page>
      <PageHeader title={t.garmin.title} back={{ href: "/settings", label: t.settings.title }} />
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-muted">{t.garmin.intro}</p>
        </Card>
        <Notice tone="warn">{t.garmin.experimental}</Notice>
        {!configured && <Notice tone="error">{t.garmin.errorServer}</Notice>}
        {conn && (
          <Card>
            <SectionTitle>{t.garmin.status}</SectionTitle>
            <GarminStatus conn={conn} />
          </Card>
        )}
        {(!conn || conn.status === "error") && (
          <Card>
            <SectionTitle>{conn ? t.garmin.reconnect : t.garmin.stepsTitle}</SectionTitle>
            <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>{t.garmin.step1}</li>
              <li>
                {t.garmin.step2}{" "}
                <a className="text-accent underline" href="https://github.com/ber10mildner-web/physiqueos/blob/main/scripts/garmin_login.py" target="_blank" rel="noreferrer">
                  garmin_login.py
                </a>
              </li>
              <li>{t.garmin.step3}</li>
            </ol>
            <GarminConnectForm />
          </Card>
        )}
      </div>
    </Page>
  );
}
