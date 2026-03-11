import { Text } from "@react-email/components";
import * as React from "react";

import { EmailShell } from "@/server/email/templates/email-shell";

type ListInviteEmailProps = {
  senderName: string;
  listName: string;
  inviteUrl: string;
};

export function ListInviteEmail({
  senderName,
  listName,
  inviteUrl,
}: ListInviteEmailProps) {
  return (
    <EmailShell
      preview={`${senderName} invited you to join ${listName} on movieshare`}
      heading={`Join ${listName}`}
      ctaLabel="Open invite"
      ctaHref={inviteUrl}
    >
      <Text style={paragraph}>
        <strong>{senderName}</strong> invited you to collaborate on{" "}
        <strong>{listName}</strong> in movieshare.
      </Text>
      <Text style={paragraph}>
        Open the invite to review the list, accept access and start contributing movies,
        feedback and watch-session context with the rest of the group.
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
