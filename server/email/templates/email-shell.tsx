import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type EmailShellProps = {
  preview: string;
  heading: string;
  children: React.ReactNode;
  ctaLabel: string;
  ctaHref: string;
  footer?: string;
};

export function EmailShell({
  preview,
  heading,
  children,
  ctaLabel,
  ctaHref,
  footer = "movieshare keeps collaborative movie planning tidy, self-hosted and friend-friendly.",
}: EmailShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={brandBlock}>
            <Text style={brandEyebrow}>movieshare</Text>
            <Heading style={headingStyle}>{heading}</Heading>
          </Section>

          <Section style={contentBlock}>{children}</Section>

          <Section style={buttonBlock}>
            <Button href={ctaHref} style={button}>
              {ctaLabel}
            </Button>
          </Section>

          <Hr style={divider} />

          <Text style={footerStyle}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f5f5f4",
  color: "#1c1917",
  fontFamily:
    "'Inter', 'Aptos', 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
  margin: "0",
  padding: "24px 0",
};

const container = {
  margin: "0 auto",
  maxWidth: "620px",
  backgroundColor: "#ffffff",
  border: "1px solid #e7e5e4",
  borderRadius: "28px",
  overflow: "hidden",
};

const brandBlock = {
  padding: "28px 32px 12px",
  background:
    "linear-gradient(135deg, rgba(245,245,244,1) 0%, rgba(255,255,255,1) 65%, rgba(245,245,244,1) 100%)",
};

const brandEyebrow = {
  margin: "0 0 12px",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "#57534e",
};

const headingStyle = {
  margin: "0",
  fontSize: "28px",
  lineHeight: "34px",
  fontWeight: 700,
  color: "#1c1917",
};

const contentBlock = {
  padding: "8px 32px 4px",
};

const buttonBlock = {
  padding: "20px 32px 8px",
};

const button = {
  backgroundColor: "#1c1917",
  color: "#fafaf9",
  borderRadius: "16px",
  padding: "14px 22px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const divider = {
  margin: "16px 32px",
  borderColor: "#e7e5e4",
};

const footerStyle = {
  margin: "0",
  padding: "0 32px 28px",
  fontSize: "12px",
  lineHeight: "18px",
  color: "#78716c",
};
