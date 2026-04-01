"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">Reset password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <p className="text-sm text-accent">{result.success}</p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <button
            onClick={() => {
              setShowForgot(false);
              setResult(null);
            }}
            className="text-sm text-primary hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Back to sign in
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Heart className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
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
                className="text-xs text-muted-foreground hover:text-primary hover:underline focus-visible:text-primary focus-visible:underline focus-visible:outline-none"
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

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline focus-visible:underline focus-visible:outline-none">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
