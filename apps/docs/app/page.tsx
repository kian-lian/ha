import Link from "next/link";
import { localize } from "@/lib/site";

const languages = [
  {
    locale: "en",
    href: "/en/docs",
    accent: "from-[#0f172a] via-[#1d4ed8] to-[#7c3aed]",
    ...localize("en"),
  },
  {
    locale: "zh",
    href: "/zh/docs",
    accent: "from-[#3f2b15] via-[#c2410c] to-[#ea580c]",
    ...localize("zh"),
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4df,transparent_38%),radial-gradient(circle_at_80%_10%,#dbeafe,transparent_30%),linear-gradient(180deg,#fffdf8,0%,#f8fafc_50%,#f4f1ea_100%)] px-6 py-10 text-neutral-950 dark:bg-[radial-gradient(circle_at_top,#31210f,transparent_35%),radial-gradient(circle_at_80%_10%,#172554,transparent_25%),linear-gradient(180deg,#09090b,0%,#111827_55%,#1f2937_100%)] dark:text-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="grid gap-8 rounded-[36px] border border-black/10 bg-white/70 p-8 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500 dark:text-neutral-400">
              Loom CLI Docs
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Bilingual product documentation for a CLI that scaffolds, configures, and extends Loom projects.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-700 dark:text-neutral-300 sm:text-lg">
              Choose your language, then jump straight into installation,
              quick start, commands, templates, and the exact shape of
              <code className="mx-1 rounded bg-black/5 px-1.5 py-0.5 text-[0.9em] dark:bg-white/10">
                loom.json
              </code>
              .
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
                Next.js 16
              </span>
              <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
                Fumadocs
              </span>
              <span className="rounded-full border border-black/10 px-3 py-1 dark:border-white/10">
                Searchable zh/en docs
              </span>
            </div>
          </div>

          <div className="rounded-[28px] border border-black/10 bg-neutral-950 p-5 text-sm text-neutral-100 shadow-inner dark:border-white/10">
            <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-neutral-400">
              <span>Run without installing globally</span>
              <span>@loom/cli</span>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4">
              <code>{`pnpm dlx @loom/cli create my-app --template next
npx @loom/cli init
bunx @loom/cli add use-toggle`}</code>
            </pre>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {languages.map((language) => (
            <article
              key={language.locale}
              className="group relative overflow-hidden rounded-[32px] border border-black/10 bg-white/75 p-7 shadow-[0_22px_90px_-52px_rgba(15,23,42,0.45)] backdrop-blur transition-transform duration-200 hover:-translate-y-1 dark:border-white/10 dark:bg-white/5"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${language.accent}`}
              />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                    {language.languageLabel}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {language.docsPath}
                  </span>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                    {language.homeEyebrow}
                  </p>
                  <h2 className="text-2xl font-semibold leading-tight">
                    {language.homeTitle}
                  </h2>
                  <p className="text-sm leading-7 text-neutral-700 dark:text-neutral-300">
                    {language.homeSummary}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/4 p-4 text-sm leading-7 text-neutral-700 dark:bg-white/5 dark:text-neutral-300">
                  {language.installHint}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={language.href}
                    className="inline-flex items-center rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
                  >
                    {language.primaryCta}
                  </Link>
                  <Link
                    href={language.locale === "en" ? "/zh/docs" : "/en/docs"}
                    className="inline-flex items-center rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    {language.secondaryCta}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
