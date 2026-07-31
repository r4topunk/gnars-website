import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Shared SMTP transport for transactional email (order receipts, etc.).
 *
 * Mirrors the SkateHive setup so the same credentials work here: Gmail SMTP by default,
 * configured via env. Server-only — NEVER import into client code.
 *
 * | Env            | Default          | Notes                                   |
 * | -------------- | ---------------- | --------------------------------------- |
 * | `SMTP_HOST`    | `smtp.gmail.com` |                                         |
 * | `SMTP_PORT`    | `587`            |                                         |
 * | `SMTP_SECURE`  | `false`          | `true` for port 465                     |
 * | `EMAIL_USER`   | —                | SMTP username / login                   |
 * | `EMAIL_PASS`   | —                | SMTP password (Gmail app password)      |
 * | `EMAIL_FROM`   | `EMAIL_USER`     | From address on outgoing mail           |
 */

const SMTP_DEFAULTS = { host: "smtp.gmail.com", port: 587, secure: false } as const;

/** Whether SMTP credentials are present. Callers should skip sending (not error) if false. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

/** The address outgoing mail is sent from. */
export function emailFrom(): string {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER || SMTP_DEFAULTS.host;
}

let cached: Transporter | undefined;

export function getMailTransport(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST || SMTP_DEFAULTS.host,
    port: Number(process.env.SMTP_PORT) || SMTP_DEFAULTS.port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : SMTP_DEFAULTS.secure,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return cached;
}
