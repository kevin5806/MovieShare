import { render } from "@react-email/render";
import nodemailer from "nodemailer";

import { NotificationCategory } from "@/generated/prisma/client";
import { env } from "@/server/env";
import { AuthCodeEmail } from "@/server/email/templates/auth-code-email";
import { FriendInviteEmail } from "@/server/email/templates/friend-invite-email";
import { ListInviteEmail } from "@/server/email/templates/list-invite-email";
import { MagicLinkEmail } from "@/server/email/templates/magic-link-email";
import { getEffectiveNotificationPreferences } from "@/server/services/notification-preference-service";
import { getEmailRuntimeConfig } from "@/server/services/system-config";

function buildAbsoluteUrl(pathname: string) {
  return new URL(pathname, env.BETTER_AUTH_URL).toString();
}

async function shouldSendCategoryEmail(
  userId: string | null | undefined,
  category: NotificationCategory,
) {
  if (!userId) {
    return true;
  }

  const preferences = await getEffectiveNotificationPreferences(userId);
  return (
    preferences.find((preference) => preference.category === category)?.effective
      .emailEnabled !== false
  );
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const config = await getEmailRuntimeConfig();

  if (!config.isConfigured || !config.host || !config.from) {
    return {
      status: "skipped" as const,
    };
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.password
        ? {
            user: config.user,
            pass: config.password,
          }
        : undefined,
  });

  try {
    await transport.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return {
      status: "sent" as const,
    };
  } catch (error) {
    console.error("sendEmail failed", error);

    return {
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

export async function sendSignInCodeEmail(input: {
  to: string;
  code: string;
  type: "sign-in" | "forget-password" | "email-verification" | "change-email";
}) {
  const loginUrl = buildAbsoluteUrl("/login");

  if (input.type !== "sign-in") {
    return sendEmail({
      to: input.to,
      subject: "Your movieshare verification code",
      text: `Your movieshare verification code is ${input.code}. Open ${loginUrl} if you need to continue the flow manually.`,
      html: await render(<AuthCodeEmail code={input.code} loginUrl={loginUrl} />),
    });
  }

  return sendEmail({
    to: input.to,
    subject: "Your movieshare sign-in code",
    text: `Your movieshare sign-in code is ${input.code}. Open ${loginUrl} to continue.`,
    html: await render(<AuthCodeEmail code={input.code} loginUrl={loginUrl} />),
  });
}

export async function sendMagicLinkEmail(input: {
  to: string;
  url: string;
}) {
  return sendEmail({
    to: input.to,
    subject: "Your movieshare sign-in link",
    text: `Open this link to sign in to movieshare: ${input.url}`,
    html: await render(<MagicLinkEmail loginUrl={input.url} />),
  });
}

export async function sendListInviteEmail(input: {
  to: string;
  senderName: string;
  listName: string;
  token: string;
  userId?: string | null;
}) {
  const emailAllowed = await shouldSendCategoryEmail(
    input.userId,
    NotificationCategory.LIST_INVITES,
  );

  if (!emailAllowed) {
    return {
      status: "skipped" as const,
    };
  }

  const inviteUrl = buildAbsoluteUrl(`/invites/lists/${input.token}`);

  return sendEmail({
    to: input.to,
    subject: `${input.senderName} invited you to join ${input.listName} on movieshare`,
    text: `${input.senderName} invited you to join "${input.listName}" on movieshare.\n\nOpen the invite: ${inviteUrl}`,
    html: await render(
      <ListInviteEmail
        senderName={input.senderName}
        listName={input.listName}
        inviteUrl={inviteUrl}
      />,
    ),
  });
}

export async function sendFriendInviteEmail(input: {
  to: string;
  senderName: string;
  message?: string | null;
  userId?: string | null;
}) {
  const emailAllowed = await shouldSendCategoryEmail(
    input.userId,
    NotificationCategory.FRIEND_INVITES,
  );

  if (!emailAllowed) {
    return {
      status: "skipped" as const,
    };
  }

  const profileUrl = buildAbsoluteUrl("/profile");

  return sendEmail({
    to: input.to,
    subject: `${input.senderName} sent you a movieshare friend invite`,
    text: `${input.senderName} sent you a movieshare friend invite.${input.message ? `\n\nMessage: ${input.message}` : ""}\n\nReview it in your profile: ${profileUrl}`,
    html: await render(
      <FriendInviteEmail
        senderName={input.senderName}
        message={input.message}
        profileUrl={profileUrl}
      />,
    ),
  });
}
