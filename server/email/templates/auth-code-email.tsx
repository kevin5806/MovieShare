import { Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailShell } from "@/server/email/templates/email-shell";

type AuthCodeEmailProps = {
  code: string;
  loginUrl: string;
};

export function AuthCodeEmail({ code, loginUrl }: AuthCodeEmailProps) {
  return (
    <EmailShell
      preview={`Your movieshare sign-in code is ${code}`}
      heading="Your sign-in code"
      ctaLabel="Open movieshare"
      ctaHref={loginUrl}
    >
      <Text style={paragraph}>
        Use the code below in movieshare to finish signing in. It stays valid for a short
        time only.
      </Text>
      <Section style={codeBox}>
        <Text style={codeText}>{code}</Text>
      </Section>
      <Text style={helper}>
        If you did not request this code, you can safely ignore this email.
      </Text>
    </EmailShell>
  );
}

const paragraph = {
  margin: "0 0 16px",
  fontSize: "15px",
  lineHeight: "26px",
  color: "#44403c",
};

const helper = {
  margin: "16px 0 0",
  fontSize: "13px",
  lineHeight: "22px",
  color: "#78716c",
};

const codeBox = {
  borderRadius: "22px",
  border: "1px solid #e7e5e4",
  backgroundColor: "#fafaf9",
  padding: "18px 22px",
};

const codeText = {
  margin: "0",
  textAlign: "center" as const,
  fontSize: "28px",
  lineHeight: "32px",
  letterSpacing: "0.26em",
  fontWeight: 700,
  color: "#1c1917",
};
