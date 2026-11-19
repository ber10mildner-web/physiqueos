import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { Notice, buttonClass } from "@/components/ui";

export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const { t } = await getI18n();
  const { reason } = await searchParams;
  const db = reason === "database";
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-4 text-2xl font-semibold">{db ? t.setup.databaseTitle : t.setup.title}</h1>
      <Notice>{db ? t.setup.databaseText : t.setup.text}</Notice>
      {db && (
        <Link href="/" className={`${buttonClass("secondary")} mt-4 w-full`}>
          {t.setup.toApp}
        </Link>
      )}
    </main>
  );
}
