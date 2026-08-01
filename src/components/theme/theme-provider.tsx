"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * App-wide theme provider (SnowUI light/dark). Defaults to light; the user's
 * choice is persisted to localStorage and applied via the `class` attribute on
 * <html>, matching the `.dark` token block in globals.css.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
