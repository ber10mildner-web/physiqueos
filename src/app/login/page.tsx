import { getI18n } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/logo";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { t } = await getI18n();
  const { error, confirmed } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-10 animate-fade-up">
        <Logo className="mb-6 size-14" />
        <h1 className="text-3xl font-semibold tracking-tight">{t.auth.title}</h1>
        <p className="mt-2 text-muted">{t.auth.subtitle}</p>
      </div>
      <LoginForm initialError={error === "confirm" ? t.auth.confirmFailed : undefined} initialInfo={confirmed ? t.auth.confirmedSignIn : undefined} />
    </main>
  );
}
