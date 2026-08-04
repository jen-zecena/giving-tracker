"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signUp, type AuthResult } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setResult(null);
      const res = await signUp(formData);
      setResult(res);
    });
  }

  return (
    <AuthSplit>
      <div className="grid gap-5">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight">
            Start your log
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            One gift is enough to begin.
          </p>
        </div>
        <form action={handleSubmit} className="grid gap-4">
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              minLength={8}
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
            {pending ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <Separator />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
