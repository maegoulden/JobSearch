import nodemailer from 'nodemailer';

let transporter = null;

function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_TO
  );
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

function diffPartsToText(diffParts) {
  return diffParts
    .map((part) => {
      const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
      return part.value
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => prefix + line)
        .join('\n');
    })
    .filter((block) => block.length > 0)
    .join('\n');
}

/**
 * Emails a notification about a detected change. No-ops (returns
 * { sent: false }) when SMTP isn't configured, so the app works fine
 * without email set up.
 */
async function sendChangeEmail(site, historyEntry) {
  if (!isEmailConfigured()) {
    return { sent: false, reason: 'not configured' };
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const diffText = diffPartsToText(historyEntry.diffParts).slice(0, 8000);

  await getTransporter().sendMail({
    from,
    to: process.env.EMAIL_TO,
    subject: `Career page changed: ${site.name}`,
    text: [
      `${site.name} changed (${site.url})`,
      `Summary: ${historyEntry.summary}`,
      '',
      diffText,
    ].join('\n'),
  });

  return { sent: true };
}

export { isEmailConfigured, sendChangeEmail, diffPartsToText };
