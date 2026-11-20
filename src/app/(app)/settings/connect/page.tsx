import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { check } from "@/lib/data/core";
import { Card, Notice, Page, PageHeader, SectionTitle } from "@/components/ui";
import { ConnectForm, TokenList } from "./connect-form";

export default async function ConnectPage() {
  const { t } = await getI18n();
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, name, token_prefix, can_write, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  check(error);
  return (
    <Page>
      <PageHeader title={t.connect.title} back={{ href: "/settings", label: t.settings.title }} />
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-muted">{t.connect.intro}</p>
        </Card>
        {!isAdminConfigured() && <Notice tone="warn">{t.connect.serverMissing}</Notice>}
        <Card>
          <ConnectForm />
        </Card>
        <Card>
          <SectionTitle>{t.connect.existing}</SectionTitle>
          <TokenList tokens={data ?? []} />
        </Card>
      </div>
    </Page>
  );
}
