import { Text } from "@react-email/components";
import * as React from "react";

import { EmailShell } from "@/server/email/templates/email-shell";

type FriendInviteEmailProps = {
  senderName: string;
  profileUrl: string;
  message?: string | null;
};

export function FriendInviteEmail({
  senderName,
  profileUrl,
  message,
}: FriendInviteEmailProps) {
  return (
    <EmailShell
      preview={`${senderName} sent you a movieshare friend invite`}
      heading="New friend invite"
      ctaLabel="Review invite"
      ctaHref={profileUrl}
    >
      <Text style={paragraph}>
        <strong>{senderName}</strong> wants to connect with you on movieshare.
      </Text>
      {message ? (
        <Text style={messageBox}>
          &ldquo;{message}&rdquo;
        </Text>
      ) : null}
      <Text style={paragraph}>
        Accepting the invite makes it easier to share collaborative lists and future watch
        sessions with the same people.
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

const messageBox = {
  margin: "0 0 16px",
  padding: "16px 18px",
  borderRadius: "18px",
  backgroundColor: "#f5f5f4",
  color: "#292524",
  fontSize: "15px",
  lineHeight: "24px",
};
