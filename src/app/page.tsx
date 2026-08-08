import Link from "next/link";
import {
  Award,
  Building2,
  CalendarDays,
  CheckCircle2,
  Flame,
  Heart,
  MapPin,
  Globe,
  Shield,
  Users,
} from "lucide-react";

import { IslandNav } from "@/components/marketing/island-nav";
import { OnePercentCalculator } from "@/components/marketing/one-percent-calculator";
import { StepsWalkthrough } from "@/components/marketing/steps-walkthrough";
import { ProgressRing } from "@/components/progress-ring";
import { Logo } from "@/components/logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * Marketing landing page, ported from the DS ui_kits/marketing-site.
 * Deliberate deviations from the kit (all flagged in the PR):
 *  - "Voices" testimonials omitted — the DS marks them as placeholder copy
 *    and no real testimonials exist.
 *  - "Watch the 60-second tour" omitted — no tour exists.
 *  - Footer Company/Legal entries are inert text (pages don't exist yet;
 *    restored per preview feedback, but not rendered as dead links).
 * Premium shows the DS's $6/mo card per preview feedback (2026-08-05),
 * although billing isn't built — "Go premium" routes to /register.
 */

const eyebrow =
  "font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint";

export default function Home() {
  return (
    <div className="bg-background">
      <IslandNav />
      <Hero />
      <Bento />
      <section id="how" className="scroll-mt-24 py-16 lg:py-28">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <StepsWalkthrough />
        </div>
      </section>
      <PrivacyBand />
      <PricingFaq />
      <Closing />
      <SiteFooter />
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────── */

function Hero() {
  return (
    <section
      className="relative overflow-hidden pt-14"
      style={{
        // DS hero geometry: the nav sits above this section in normal flow,
        // so the green band starts below the header, and the wash fades to
        // sand at 62% — the DS's own stop (screenshot feedback 2026-08-05:
        // green started mid-header and read too strong).
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--green-50) 55%, var(--sand-50)) 0%, var(--sand-50) 62%)",
      }}
    >
      <div className="relative z-10 mx-auto max-w-[1180px] px-5 lg:px-10 text-center">
        <h1 className="mx-auto font-display font-bold text-6xl sm:text-7xl lg:text-[92px] leading-[0.98] tracking-tight text-green-900">
          Give a little,
          <br />
          every year.
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-lg lg:text-[19px] leading-relaxed text-muted-foreground [text-wrap:pretty]">
          The log for your charitable giving — a running record of where your
          money went, and how close you are to giving 1% of what you earn.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" render={<Link href="/register" />}>
            Start your log
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/login" />}>
            Sign in
          </Button>
        </div>
        <p className={cn("mt-4", eyebrow)}>
          Free forever · we never move your money
        </p>
      </div>

      {/* Product surface, bleeding off the fold (decorative) */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none relative mx-auto mt-14 max-w-[1180px] px-5 lg:px-10"
      >
        <div
          className="rounded-t-[22px] bg-card p-6 pb-10"
          style={{
            boxShadow:
              "var(--shadow-hairline), 0 -1px 60px -20px rgba(26,27,25,0.28)",
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            {["bg-(--sand-300)", "bg-(--sand-200)", "bg-(--sand-200)"].map(
              (c, i) => (
                <span key={i} className={cn("h-2.5 w-2.5 rounded-full", c)} />
              )
            )}
            <span className={cn("ml-3", eyebrow)}>Overview · 2026</span>
          </div>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <HeroTile
              label="Given this year"
              value="$4,820"
              sub="+12% vs last year"
              tint="bg-metric-green"
              icon={<Heart className="h-4 w-4" />}
            />
            <HeroTile
              label="Organizations"
              value="14"
              sub="3 new this year"
              tint="bg-metric-blue"
              icon={<Building2 className="h-4 w-4" />}
            />
            <HeroTile
              label="This month"
              value="$320"
              sub="−8% vs last month"
              tint="bg-metric-clay"
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <HeroTile
              label="Streak"
              value="7 mo"
              sub="Personal best"
              tint="bg-metric-honey"
              icon={<Flame className="h-4 w-4" />}
            />
          </div>
          <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl bg-card p-6 shadow-2xs shadow-xs">
              <div className="text-lg font-semibold tracking-tight text-text-strong">
                Monthly giving
              </div>
              <div className="mb-4 text-sm text-muted-foreground">
                Last 12 months
              </div>
              <div className="flex h-[120px] items-end gap-2">
                {[180, 240, 120, 300, 260, 340, 220, 480, 620, 275, 310, 320].map(
                  (v, i, a) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-[5px] rounded-b-[3px]"
                      style={{
                        height: (v / Math.max(...a)) * 110,
                        background:
                          i === a.length - 1
                            ? "var(--brand)"
                            : "var(--green-300)",
                      }}
                    />
                  )
                )}
              </div>
            </div>
            <div className="grid place-items-center rounded-xl bg-brand-soft p-6">
              <ProgressRing
                value={78}
                caption="0.78%"
                sublabel="of your 1% goal"
                size={124}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroTile({
  label,
  value,
  sub,
  tint,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1 rounded-xl p-4", tint)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-mono text-2xl font-semibold text-text-strong">
        {value}
      </div>
      <div className="text-[11px] text-text-faint">{sub}</div>
    </div>
  );
}

/* ── Bento ────────────────────────────────────────────────── */

const tile =
  "flex flex-col gap-3.5 rounded-2xl bg-card p-6 shadow-2xs shadow-xs";

function Bento() {
  return (
    <section id="why" className="scroll-mt-24 pt-24">
      <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className={eyebrow}>The whole idea</span>
            <h2 className="mt-2.5 max-w-[520px] text-3xl lg:text-[44px] leading-[1.08] font-bold tracking-tight">
              One percent, made impossible to forget.
            </h2>
          </div>
          <p className="m-0 max-w-[340px] text-base text-muted-foreground [text-wrap:pretty]">
            Small enough to keep up with. Big enough to matter. Move to 2% when
            you&apos;re ready.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <OnePercentCalculator />

          <div
            className={cn(
              tile,
              "sm:col-span-2 items-center justify-center text-center"
            )}
          >
            <ProgressRing value={78} caption="0.78%" sublabel="of 1%" size={132} />
            <p className="m-0 text-sm text-muted-foreground">
              The ring closes as the year goes on.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-3.5 rounded-2xl bg-metric-honey p-6 sm:col-span-1">
            <Flame className="h-6 w-6 text-warning" aria-hidden />
            <div>
              <div className="font-mono text-[34px] font-semibold tracking-[-0.03em] text-text-strong">
                7
              </div>
              <div className="text-sm text-muted-foreground">months running</div>
            </div>
          </div>

          <div className={cn(tile, "sm:col-span-2")}>
            <span className={eyebrow}>Where it goes</span>
            <div className="grid gap-3">
              <BentoBar
                label="Environment"
                value="$1,240"
                pct={64}
                color="var(--chart-1)"
              />
              <BentoBar
                label="Education"
                value="$980"
                pct={51}
                color="var(--chart-2)"
              />
              <BentoBar
                label="Hunger"
                value="$720"
                pct={38}
                color="var(--chart-3)"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-2xl bg-surface-sunken p-6 sm:col-span-2">
            <span className={eyebrow}>Milestones</span>
            <div className="grid gap-2.5">
              {(
                [
                  [Award, "1% Club", "in-progress"],
                  [MapPin, "Local Hero", "earned"],
                  [Flame, "Six-month streak", "earned"],
                ] as const
              ).map(([Icon, name, st]) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-md",
                      st === "earned"
                        ? "bg-(--green-100) text-green-700"
                        : "bg-info-soft text-info"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-text-strong">
                    {name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      st === "earned"
                        ? "bg-success-soft text-green-700"
                        : "bg-info-soft text-info"
                    )}
                  >
                    {st === "earned" ? "Earned" : "78%"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(tile, "sm:col-span-2")}>
            <span className={eyebrow}>Verified nonprofits</span>
            <p className="m-0 text-[17px] text-foreground [text-wrap:pretty]">
              Every organization you can search is an IRS-verified 501(c)(3),
              cross-checked against the federal database.
            </p>
            <Link
              href="/nonprofits"
              className="mt-auto inline-flex items-center gap-2 rounded-md text-sm font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden />
              Search the directory
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BentoBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-sunken">
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Privacy band ─────────────────────────────────────────── */

const TIERS = [
  {
    Icon: Shield,
    name: "Private",
    desc: "Only you can see your giving. This is the default.",
  },
  {
    Icon: Users,
    name: "Friends only",
    desc: "People you approve see your activity. Amounts stay hidden.",
  },
  {
    Icon: Globe,
    name: "Open giver",
    desc: "Publicly discoverable, percentage included. Inspire others.",
  },
] as const;

function PrivacyBand() {
  return (
    <section
      id="privacy"
      className="scroll-mt-24 bg-surface-inverse py-16 lg:py-24"
    >
      <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
        <div className="mb-10 grid items-end gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
              Privacy first
            </span>
            <h2 className="mt-3 font-display font-bold text-4xl lg:text-[52px] leading-[1.05] text-white">
              Your income is
              <br />
              nobody&apos;s business.
            </h2>
          </div>
          <p className="m-0 text-[17px] leading-relaxed text-white/70 [text-wrap:pretty]">
            Salary is stored encrypted and never displayed — only the
            percentage you give, and only if you opt in. Leaderboards rank
            streaks and counts, never dollars.
          </p>
        </div>
        {/* Preview feedback: make it explicit that the tiles below are the
            privacy options the member picks from. */}
        <p className="mb-4 text-[15px] font-semibold text-white/85">
          You choose one of three privacy levels — and can change it whenever
          you like:
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map(({ Icon, name, desc }) => (
            <div
              key={name}
              className="grid content-start gap-3.5 rounded-2xl bg-white/[0.07] p-6"
            >
              <span className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-white/10 text-(--green-300)">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="text-[19px] font-semibold text-white">{name}</div>
              <p className="m-0 text-sm text-white/60 [text-wrap:pretty]">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing + FAQ ────────────────────────────────────────── */

function PricingFaq() {
  return (
    <section id="pricing" className="scroll-mt-24 py-16 lg:py-24">
      <div className="mx-auto grid max-w-[1180px] items-start gap-10 px-5 lg:grid-cols-2 lg:gap-14 lg:px-10">
        <div>
          <span className={eyebrow}>Pricing</span>
          <h2 className="mt-2.5 mb-6 text-3xl lg:text-[40px] leading-[1.1] font-bold tracking-tight">
            Free where it counts.
          </h2>
          <div className="grid gap-3.5">
            <div className="grid gap-3 rounded-xl bg-card p-6 shadow-2xs shadow-xs">
              <div className="flex items-baseline justify-between">
                <span className="text-[19px] font-semibold text-text-strong">
                  Free
                </span>
                <span className="font-mono text-xl text-text-strong">$0</span>
              </div>
              <p className="m-0 text-sm text-muted-foreground">
                Logging, your dashboard, milestones, and following friends.
              </p>
              <Button variant="outline" render={<Link href="/register" />}>
                Start your log
              </Button>
            </div>
            {/* Preview feedback: show the full DS Premium card (price and
                CTA) even though billing isn't built yet. */}
            <div className="grid gap-3 rounded-xl bg-brand-soft p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[19px] font-semibold text-green-900">
                  Premium
                </span>
                <span className="font-mono text-xl text-green-900">
                  $6<span className="text-[13px]">/mo</span>
                </span>
              </div>
              <p className="m-0 text-sm text-green-900/75">
                Multi-year trends, CSV and tax summaries, receipt storage, and
                custom goals.
              </p>
              <Button render={<Link href="/register" />}>Go premium</Button>
            </div>
          </div>
        </div>
        <div>
          <span className={eyebrow}>Questions</span>
          <h2 className="mt-2.5 mb-6 text-3xl lg:text-[40px] leading-[1.1] font-bold tracking-tight">
            The short answers.
          </h2>
          <Accordion>
            {(
              [
                [
                  "Does Giving Tracker process my donations?",
                  "No. You give wherever you already give; this is the log, not the checkout.",
                ],
                [
                  "Is my income ever public?",
                  "Never. Only the derived percentage, and only if you choose Open giver.",
                ],
                [
                  "How are nonprofits verified?",
                  "Search results are restricted to IRS-verified 501(c)(3) organizations, with community flagging and manual review on top.",
                ],
                [
                  "What happens to a recurring gift I skip?",
                  "Nothing is counted until you confirm it. Skipped gifts never touch your totals.",
                ],
              ] as const
            ).map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left text-[15px] font-semibold text-text-strong">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

/* ── Closing + footer ─────────────────────────────────────── */

function Closing() {
  return (
    <section className="pb-16 lg:pb-24">
      <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
        <div className="rounded-2xl bg-brand px-8 py-14 lg:py-[72px] text-center">
          <h2 className="m-0 font-display font-bold text-4xl lg:text-[56px] leading-[1.05] text-white">
            Start the log today.
          </h2>
          <p className="mx-auto mt-4 mb-8 max-w-[440px] text-[17px] text-white/80">
            One gift is enough to begin. The ring takes care of the rest.
          </p>
          <Button
            size="lg"
            variant="secondary"
            render={<Link href="/register" />}
          >
            Create your free account
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div>
          <Logo />
          <p className="mt-3.5 max-w-[260px] text-sm text-muted-foreground">
            A running record of your giving, and a nudge toward 1%.
          </p>
        </div>
        <div>
          <div className={eyebrow}>Product</div>
          <div className="mt-3 grid justify-items-start gap-2">
            {(
              [
                ["Overview", "/dashboard"],
                ["Milestones", "/badges"],
                ["Nonprofits", "/nonprofits"],
                ["Pricing", "#pricing"],
              ] as const
            ).map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-sm text-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        {/* Per preview feedback: the DS's Company/Legal sections return even
            though these pages don't exist yet — rendered as inert text so
            nothing navigates nowhere. */}
        {(
          [
            ["Company", ["About", "Blog", "Contact"]],
            ["Legal", ["Privacy", "Terms", "Security"]],
          ] as const
        ).map(([heading, items]) => (
          <div key={heading}>
            <div className={eyebrow}>{heading}</div>
            <div className="mt-3 grid justify-items-start gap-2">
              {items.map((label) => (
                <span
                  key={label}
                  className="text-sm text-muted-foreground"
                  title="Coming soon"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-[1180px] border-t border-border px-5 pt-5 lg:px-10">
        <span className="text-xs text-text-faint">
          © 2026 Giving Tracker · Tracking only. We never touch your money.
        </span>
      </div>
    </footer>
  );
}
