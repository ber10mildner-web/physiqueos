import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { Card, Notice, Page, PageHeader, SectionTitle } from "@/components/ui";
import { WidgetForm } from "./widget-form";

/** Remaining kcal and macros on the home / lock screen (iPhone via Scriptable) and app shortcuts. */
export default async function WidgetPage() {
  const { t } = await getI18n();
  await requireUser();
  return (
    <Page>
      <PageHeader title={t.widget.title} back={{ href: "/settings", label: t.settings.title }} />
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-muted">{t.widget.intro}</p>
        </Card>
        {!isAdminConfigured() && <Notice tone="warn">{t.connect.serverMissing}</Notice>}
        <Card>
          <SectionTitle>{t.widget.iphone}</SectionTitle>
          <p className="mb-3 text-sm text-muted">{t.widget.iphoneIntro}</p>
          <WidgetForm />
        </Card>
        <Card>
          <SectionTitle>{t.widget.shortcuts}</SectionTitle>
          <p className="text-sm text-muted">{t.widget.shortcutsText}</p>
        </Card>
      </div>
    </Page>
  );
}
