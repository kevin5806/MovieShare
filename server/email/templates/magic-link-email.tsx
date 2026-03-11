import { Text } from "@react-email/components";
import * as React from "react";

import { EmailShell } from "@/server/email/templates/email-shell";

type MagicLinkEmailProps = {
  loginUrl: string;
};

export function MagicLinkEmail({ loginUrl }: MagicLinkEmailProps) {
  return (
    <EmailShell
      preview="Your movieshare sign-in link is ready"
      heading="Continue to movieshare"
      ctaLabel="Sign in now"
      ctaHref={loginUrl}
    >
      <Text style={paragraph}>
        Open the button below to enter movieshare without typing a password on this device.
      </Text>
      <Text style={paragraph}>
        The link expires soon. If you did not request it, you can ignore this email.
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
