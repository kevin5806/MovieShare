import nodemailer from "nodemailer";

import { env } from "@/server/env";
import { getEmailRuntimeConfig } from "@/server/services/system-config";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildAbsoluteUrl(pathname: string) {
  return new URL(pathname, env.BETTER_AUTH_URL).toString();
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

export async function sendListInviteEmail(input: {
  to: string;
  senderName: string;
  listName: string;
  token: string;
}) {
  const inviteUrl = buildAbsoluteUrl(`/invites/lists/${input.token}`);

  return sendEmail({
    to: input.to,
    subject: `${input.senderName} invited you to join ${input.listName} on movielist`,
    text: `${input.senderName} invited you to join "${input.listName}" on movielist.\n\nOpen the invite: ${inviteUrl}`,
    html: `
      <p><strong>${escapeHtml(input.senderName)}</strong> invited you to join <strong>${escapeHtml(input.listName)}</strong> on movielist.</p>
      <p><a href="${inviteUrl}">Open the invite</a></p>
    `,
  });
}

export async function sendFriendInviteEmail(input: {
  to: string;
  senderName: string;
  message?: string | null;
}) {
  const profileUrl = buildAbsoluteUrl("/profile");
  const safeMessage = input.message ? escapeHtml(input.message) : null;

  return sendEmail({
    to: input.to,
    subject: `${input.senderName} sent you a movielist friend invite`,
    text: `${input.senderName} sent you a movielist friend invite.${input.message ? `\n\nMessage: ${input.message}` : ""}\n\nReview it in your profile: ${profileUrl}`,
    html: `
      <p><strong>${escapeHtml(input.senderName)}</strong> sent you a movielist friend invite.</p>
      ${safeMessage ? `<p>Message: ${safeMessage}</p>` : ""}
      <p><a href="${profileUrl}">Review the invite</a></p>
    `,
  });
}
