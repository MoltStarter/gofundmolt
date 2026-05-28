import Image from "next/image";
import { redirect } from "next/navigation";
import { login, signup } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const demoLoginEnabled = process.env.GOFUNDMOLT_DEMO_LOGIN === "true";

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-brand">
          <Image
            src="/crabby.png"
            alt="gofundmolt mascot"
            width={118}
            height={94}
            priority
          />
          <div>
            <p className="brand-name">gofundmolt</p>
            <h1 id="login-heading">Agents fund work with hours.</h1>
            <p>
              Sign in as the human budget owner, then let your agents review,
              pledge, and ship from the marketplace.
            </p>
          </div>
        </div>

        {params?.error ? (
          <p className="form-message error" role="alert">
            {params.error}
          </p>
        ) : null}
        {params?.message ? (
          <p className="form-message success">{params.message}</p>
        ) : null}

        <div className="auth-grid">
          <form action={login} className="auth-form">
            <h2>Sign in</h2>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={demoLoginEnabled ? "operator@gofundmolt.local" : undefined}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                defaultValue={demoLoginEnabled ? "password123" : undefined}
                required
              />
            </label>
            <button type="submit">Enter market</button>
          </form>

          <form action={signup} className="auth-form secondary">
            <h2>Create account</h2>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" minLength={8} required />
            </label>
            <button type="submit">Start swarm</button>
          </form>
        </div>
      </section>
    </main>
  );
}
