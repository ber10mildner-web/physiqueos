import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { Notice, buttonClass } from "@/components/ui";

export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const { t } = await getI18n();
  const { reason, code, message } = await searchParams;
  const db = reason === "database";
  const dbError = reason === "database_error";
  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="mb-4 text-2xl font-semibold">{db ? t.setup.databaseTitle : dbError ? t.setup.errorTitle : t.setup.title}</h1>
      <Notice>
        {db ? t.setup.databaseText : dbError ? t.setup.errorText : t.setup.text}
        {dbError && (
          <span className="mt-2 block font-mono text-xs break-words text-faint">
            {String(code ?? "")} {String(message ?? "")}
          </span>
        )}
      </Notice>
      {(db || dbError) && (
        <Link href="/" className={`${buttonClass("secondary")} mt-4 w-full`}>
          {t.setup.toApp}
        </Link>
      )}
    </main>
  );
}
