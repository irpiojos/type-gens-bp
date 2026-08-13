import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { RECOVERY_EMAIL } from "@/lib/constants";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-black/15 bg-white p-6 shadow-[2px_2px_0_#1a1a1a]">
        <h1 className="font-display text-3xl">Team Tasks Manager</h1>
        <p className="mt-1 text-sm text-ink/60">Shared workspace · Historians</p>
        <LoginForm />
        <p className="mt-6 text-xs text-ink/50">
          Forgot password? Contact{" "}
          <a className="underline" href={`mailto:${RECOVERY_EMAIL}`}>
            {RECOVERY_EMAIL}
          </a>{" "}
          (superuser).
        </p>
      </div>
    </main>
  );
}