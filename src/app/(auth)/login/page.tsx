"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signIn, forgotPassword, type AuthResult } from "@/lib/actions/auth";

export default function LoginPage() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [showForgot, setShowForgot] = useState(false);

  function handleSignIn(formData: FormData) {
    startTransition(async () => {
      setResult(null);
      const res = await signIn(formData);
      // signIn redirects on success, so we only reach here on error
      setResult(res);
    });
  }

  function handleForgotPassword(formData: FormData) {
    startTransition(async () => {
      setResult(null);
      const res = await forgotPassword(formData);
      setResult(res);
    });
  }

  if (showForgot) {
    return (
      <AuthSplit>
        <div className="grid gap-5">
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight">
              Reset password
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Enter your email and we&apos;ll send a reset link.
            </p>
          </div>
          <form action={handleForgotPassword} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {result?.error && (
              <p className="text-sm text-destructive">{result.error}</p>
            )}
            {result?.success && (
              <p className="text-sm text-success">{result.success}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <Separator />
          <p className="text-center text-sm text-muted-foreground">
            <button
              onClick={() => {
                setShowForgot(false);
                setResult(null);
              }}
              className="text-brand hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Back to sign in
            </button>
          </p>
        </div>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <div className="grid gap-5">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Pick up where your log left off.
          </p>
        </div>
        <form action={handleSignIn} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setResult(null);
                }}
                className="text-xs text-muted-foreground hover:text-brand hover:underline focus-visible:text-brand focus-visible:underline focus-visible:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {result?.error && (
            <p className="text-sm text-destructive">{result.error}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <Separator />
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href="/register"
            className="text-brand hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
