import { getI18n } from "@/lib/i18n/server";
import { Notice } from "@/components/ui";

export default async function SetupPage() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-4 text-2xl font-semibold">{t.setup.title}</h1>
      <Notice>{t.setup.text}</Notice>
    </main>
  );
}
