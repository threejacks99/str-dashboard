// lib/email-templates.ts
// Branded transactional email builders. Pure string producers — no transport here.
// HTML mirrors the Supabase password-reset template so all Hostics mail shares one
// look. Pair the output with sendEmail() from ./postmark.

import { TIER_LABELS, TIER_PRICES, type Tier, type BillingInterval } from './billing'

const LOGO_URL = 'https://hostics.app/hostics-logo-email.png'
const BILLING_URL = 'https://hostics.app/billing'
const DASHBOARD_URL = 'https://hostics.app/dashboard'
const SUPPORT_EMAIL = 'support@hostics.app'

type Cta = { label: string; url: string }

interface LayoutParams {
  heading: string
  intro: string[]       // navy body paragraphs (may contain intentional inline HTML)
  cta?: Cta
  finePrint?: string[]  // smaller grey paragraphs below the CTA
  recipientEmail: string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function renderHtml({ heading, intro, cta, finePrint, recipientEmail }: LayoutParams): string {
  const introHtml = intro
    .map(p => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;font-weight:400;color:#0D2C54;">${p}</p>`)
    .join('')

  const ctaHtml = cta
    ? `<table cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
                <tr>
                  <td style="border-radius:8px;background:#FF7767;">
                    <a href="${cta.url}" style="display:inline-block;padding:13px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(cta.label)}</a>
                  </td>
                </tr>
              </table>`
    : ''

  const finePrintHtml = (finePrint ?? [])
    .map(p => `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;font-weight:400;color:#6b7280;">${p}</p>`)
    .join('')

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FB;padding:32px 0;font-family:'Raleway','Helvetica Neue',Arial,sans-serif;">
  <tr>
    <td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #f3f4f6;">
            <img src="${LOGO_URL}" alt="Hostics — STR Analytics" width="180" style="display:block;border:0;outline:none;text-decoration:none;height:auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <h1 style="margin:0 0 16px;font-size:21px;font-weight:800;color:#0D2C54;letter-spacing:-0.01em;">${escapeHtml(heading)}</h1>
            ${introHtml}
            ${ctaHtml}
            ${finePrintHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#F8F9FB;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;line-height:1.5;font-weight:400;color:#9aa0a6;">
              Hostics · Short-term rental management<br>
              This email was sent to ${escapeHtml(recipientEmail)}.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

function renderText({ heading, intro, cta, finePrint, recipientEmail }: LayoutParams): string {
  const lines: string[] = [heading, '']
  for (const p of intro) lines.push(stripTags(p), '')
  if (cta) lines.push(`${cta.label}: ${cta.url}`, '')
  for (const p of finePrint ?? []) lines.push(stripTags(p), '')
  lines.push('—', 'Hostics · Short-term rental management', `This email was sent to ${recipientEmail}.`)
  return lines.join('\n')
}

function build(params: LayoutParams, subject: string) {
  return { subject, htmlBody: renderHtml(params), textBody: renderText(params) }
}

function intervalWord(i: BillingInterval): string { return i === 'annual' ? 'year' : 'month' }
function intervalLabel(i: BillingInterval): string { return i === 'annual' ? 'annual' : 'monthly' }
function priceLabel(tier: Tier, interval: BillingInterval): string {
  return `$${TIER_PRICES[tier][interval].toLocaleString('en-US')}/${intervalWord(interval)}`
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const support = `Questions? Reply to this email or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#0D2C54;">${SUPPORT_EMAIL}</a>.`

export function signupConfirmationEmail(accountName: string, recipientEmail: string) {
  return build({
    heading: 'Welcome to Hostics',
    intro: [
      `Hi ${escapeHtml(accountName)}, your Hostics account is ready.`,
      `Sign in any time to import your bookings and expenses and watch your numbers come together. When you're ready, pick a plan to start your 14-day free trial — no charge until day 15, and you can cancel anytime.`,
    ],
    cta: { label: 'Go to your dashboard', url: DASHBOARD_URL },
    finePrint: [support],
    recipientEmail,
  }, 'Welcome to Hostics')
}

export function trialEndingEmail(args: {
  accountName: string; recipientEmail: string; tier: Tier; interval: BillingInterval; trialEndsAt: string
}) {
  const when = formatDate(args.trialEndsAt)
  return build({
    heading: 'Your trial ends soon',
    intro: [
      `Hi ${escapeHtml(args.accountName)}, your 14-day Hostics trial ends on ${when}.`,
      `You don't need to do anything to keep your account — your ${TIER_LABELS[args.tier]} plan (${priceLabel(args.tier, args.interval)}) begins automatically that day. Want to change or cancel first? Manage everything from your billing settings.`,
    ],
    cta: { label: 'Manage subscription', url: BILLING_URL },
    finePrint: [support],
    recipientEmail: args.recipientEmail,
  }, `Your Hostics trial ends ${when}`)
}

export function planChangeEmail(args: {
  accountName: string; recipientEmail: string
  oldTier: Tier; oldInterval: BillingInterval; newTier: Tier; newInterval: BillingInterval
}) {
  return build({
    heading: 'Your plan has changed',
    intro: [
      `Hi ${escapeHtml(args.accountName)}, your Hostics subscription has been updated from ${TIER_LABELS[args.oldTier]} (${intervalLabel(args.oldInterval)}) to ${TIER_LABELS[args.newTier]} (${intervalLabel(args.newInterval)}).`,
      `Your new rate is ${priceLabel(args.newTier, args.newInterval)}. If you didn't make this change, please contact us right away.`,
    ],
    cta: { label: 'View billing', url: BILLING_URL },
    finePrint: [support],
    recipientEmail: args.recipientEmail,
  }, 'Your Hostics plan has changed')
}
