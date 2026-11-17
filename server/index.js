const fs = require('fs');
const path = require('path');
const express = require('express');
const { sendToSupport } = require('./support');
const { createFormToken, spamReason } = require('./spam');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const contactPage = fs.readFileSync(path.join(PUBLIC_DIR, 'contact.html'), 'utf8');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve the contact page with a fresh token that records when it was loaded.
app.get(['/contact', '/contact.html'], (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('html').send(contactPage.replace('{{FORM_TOKEN}}', createFormToken()));
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.post('/contact', (req, res) => {
  // Drop spam quietly. Bots get the same success reply as people, so they
  // have no reason to try something different.
  const reason = spamReason(req.body);
  if (reason) {
    console.log(`[spam] Dropped a submission: ${reason}`);
    return res.json({ ok: true });
  }

  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim();
  const message = (req.body.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: 'Please fill in your name, email and message.' });
  }

  sendToSupport({ name, email, message });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Calico Media site running at http://localhost:${PORT}`);
});
