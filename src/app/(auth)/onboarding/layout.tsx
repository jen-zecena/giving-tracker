export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The centered wrapper the whole (auth) group used before the split-
  // screen login/register redesign — preserved here for the wizard.
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      {children}
    </div>
  );
}
