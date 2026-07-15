import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey
  ? new Resend(apiKey)
  : null;

export const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? "";

export const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ??
  "CatchCatchBo <onboarding@resend.dev>";
