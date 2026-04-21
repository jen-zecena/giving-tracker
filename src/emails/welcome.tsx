import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type WelcomeProps = {
  displayName: string | null;
  /** Origin used to build the CTA link — falls back to localhost for dev. */
  siteUrl?: string;
};

const DEFAULT_SITE_URL = "http://localhost:3000";

export function WelcomeEmail({ displayName, siteUrl }: WelcomeProps) {
  const origin = siteUrl ?? DEFAULT_SITE_URL;
  const greeting = displayName?.trim() ? `Hi ${displayName.trim()},` : "Hi there,";

  return (
    <Html>
      <Head />
      <Preview>Welcome to Giving Tracker — let&apos;s log your first gift.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Giving Tracker</Text>
          </Section>

          <Section>
            <Text style={h1}>Welcome aboard.</Text>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              Giving Tracker is your private ledger for charitable giving — log
              donations, watch totals add up, and share as much (or as little)
              as you want.
            </Text>
            <Text style={paragraph}>Three quick wins to get started:</Text>
            <Text style={listItem}>
              <strong>1.</strong> Log your first donation — even one you gave
              last year counts.
            </Text>
            <Text style={listItem}>
              <strong>2.</strong> Set a giving goal for the year.
            </Text>
            <Text style={listItem}>
              <strong>3.</strong> Pick a privacy tier. Private by default; flip
              to Friends Only or Open Giver whenever you&apos;re ready.
            </Text>

            <Button style={button} href={`${origin}/dashboard`}>
              Open your dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>
              You can mute these emails any time from Settings → Notifications.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeEmail.PreviewProps = {
  displayName: "Alex",
  siteUrl: "http://localhost:3000",
} satisfies WelcomeProps;

export default WelcomeEmail;

const body = {
  backgroundColor: "#f7f9fb",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "32px auto",
  padding: "32px",
  maxWidth: "560px",
  borderRadius: "12px",
};

const header = {
  paddingBottom: "16px",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: "24px",
};

const brand = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#5b5bdb",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  margin: 0,
};

const h1 = {
  fontSize: "24px",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 16px",
  letterSpacing: "-0.01em",
};

const paragraph = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 12px",
};

const listItem = {
  fontSize: "15px",
  lineHeight: "22px",
  color: "#374151",
  margin: "0 0 8px",
  paddingLeft: "8px",
};

const button = {
  backgroundColor: "#5b5bdb",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  borderRadius: "8px",
  padding: "12px 20px",
  display: "inline-block",
  marginTop: "16px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0 16px",
};

const footer = {
  fontSize: "12px",
  color: "#6b7280",
  lineHeight: "18px",
  margin: 0,
};
