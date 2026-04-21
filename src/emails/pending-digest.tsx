import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

export type PendingDigestItem = {
  scheduleId: string;
  organizationName: string;
  /** ISO date — "YYYY-MM-DD" or full ISO. */
  dueDate: string;
  amount: number;
};

export type PendingDigestProps = {
  displayName: string | null;
  items: PendingDigestItem[];
  /** Origin for the action link — the same link the in-app notification uses. */
  siteUrl?: string;
};

const DEFAULT_SITE_URL = "http://localhost:3000";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PendingDigestEmail({
  displayName,
  items,
  siteUrl,
}: PendingDigestProps) {
  const origin = siteUrl ?? DEFAULT_SITE_URL;
  const greeting = displayName?.trim() ? `Hi ${displayName.trim()},` : "Hi there,";
  const count = items.length;

  return (
    <Html>
      <Head />
      <Preview>
        {count === 1
          ? "1 scheduled donation needs confirming."
          : `${count} scheduled donations need confirming.`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Giving Tracker</Text>
          </Section>

          <Section>
            <Text style={h1}>
              {count === 1
                ? "You have 1 pending donation"
                : `You have ${count} pending donations`}
            </Text>
            <Text style={paragraph}>{greeting}</Text>
            <Text style={paragraph}>
              These scheduled gifts came due. Confirm the ones you actually
              made, or skip the rest — nothing is logged until you say so.
            </Text>
          </Section>

          <Section style={list}>
            {items.map((item) => (
              <Row key={item.scheduleId} style={listRow}>
                <Text style={listOrg}>{item.organizationName}</Text>
                <Text style={listMeta}>
                  {formatCurrency(item.amount)} · due {formatDate(item.dueDate)}
                </Text>
              </Row>
            ))}
          </Section>

          <Section style={{ textAlign: "center" as const }}>
            <Button
              style={button}
              href={`${origin}/donations?status=pending`}
            >
              Review pending donations
            </Button>
          </Section>

          <Hr style={hr} />

          <Section>
            <Text style={footer}>
              You&apos;re getting this daily digest because you have scheduled
              recurring gifts. Mute it any time from Settings → Notifications.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

PendingDigestEmail.PreviewProps = {
  displayName: "Alex",
  items: [
    {
      scheduleId: "s1",
      organizationName: "Red Cross",
      dueDate: "2026-04-18",
      amount: 50,
    },
    {
      scheduleId: "s2",
      organizationName: "UNICEF",
      dueDate: "2026-04-20",
      amount: 25,
    },
  ],
  siteUrl: "http://localhost:3000",
} satisfies PendingDigestProps;

export default PendingDigestEmail;

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
  fontSize: "22px",
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

const list = {
  backgroundColor: "#f7f9fb",
  borderRadius: "8px",
  padding: "8px 16px",
  margin: "16px 0 24px",
};

const listRow = {
  padding: "12px 0",
  borderBottom: "1px solid #e5e7eb",
};

const listOrg = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#111827",
  margin: 0,
};

const listMeta = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "4px 0 0",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
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
