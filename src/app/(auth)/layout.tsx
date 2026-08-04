export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login/register render the full-bleed split screen themselves;
  // onboarding restores the centered wrapper in its own nested layout.
  return <>{children}</>;
}
