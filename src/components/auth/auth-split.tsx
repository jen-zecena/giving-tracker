import { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * DS marketing-site sign-in shell: a split screen with a deep-green brand
 * panel beside the form column. The DS panel featured a member quote, but
 * no real testimonials exist — the panel carries the product's factual
 * privacy statement instead (flagged in the PR).
 */
export function AuthSplit({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:grid content-between p-12 bg-surface-inverse">
        <Link
          href="/"
          className="justify-self-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Logo inverse />
        </Link>
        <div>
          <p className="font-display text-[34px] leading-[1.25] text-white max-w-[420px] [text-wrap:pretty]">
            Your income is nobody&apos;s business.
          </p>
          <p className="mt-4 text-sm text-white/60 max-w-[400px]">
            Salary is stored encrypted and never displayed — only the
            percentage you give, and only if you opt in.
          </p>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/35">
          Tracking only · we never move your money
        </div>
      </div>

      <div className="grid place-items-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[380px]">
          {/* Wordmark for small screens, where the brand panel is hidden */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Logo size="sm" />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
