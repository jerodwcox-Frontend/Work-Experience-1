const crypto = require('crypto');

// Bots submit the form instantly. People take longer than this to type a
// name, email and message.
const MIN_FILL_TIME_MS = 3000;

// Used to sign the form token so a bot can't make up its own load time.
// Set FORM_SECRET in production so tokens stay valid across restarts.
const SECRET = process.env.FORM_SECRET || crypto.randomBytes(32).toString('hex');

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

// Called when the contact page is served. Records the time the form loaded,
// signed so it can't be changed.
function createFormToken(now = Date.now()) {
  const issuedAt = String(now);
  return `${issuedAt}.${sign(issuedAt)}`;
}

// Returns the reason a submission looks like spam, or null if it looks real.
function spamReason(body, now = Date.now()) {
  if (body.website) {
    return 'honeypot filled in';
  }

  const [issuedAt, signature] = String(body.form_token || '').split('.');
  const expected = sign(issuedAt || '');
  const valid =
    signature &&
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!valid) {
    return 'missing or invalid form token';
  }

  if (now - Number(issuedAt) < MIN_FILL_TIME_MS) {
    return 'sent too quickly';
  }

  return null;
}

module.exports = { createFormToken, spamReason, MIN_FILL_TIME_MS };
