import { db } from '../../../server/db.ts';
import { processOutboxQueue } from '../../../server/email.ts';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

console.log('Testing outbox timer and processor functionality...');

// 1. Enqueue a test outbox email
const testEmailId = `test_probe_${crypto.randomUUID()}`;
const now = new Date().toISOString();

db.prepare(`
  INSERT INTO email_outbox (
    id, application_id, recipient, recipient_type, subject, body_html, body_text, status, created_at
  ) VALUES (?, 'app_probe', 'probe@nexusfinance.com', 'applicant', 'Probe Subject', '<p>Test</p>', 'Test', 'pending', ?)
`).run(testEmailId, now);

// Verify inserted as pending
const before = db.prepare('SELECT status, attempts FROM email_outbox WHERE id = ?').get(testEmailId);
assert.equal(before.status, 'pending');

// 2. Run processOutboxQueue
const result = await processOutboxQueue();
console.log('processOutboxQueue result:', result);
assert.ok(result.processed >= 1);
assert.ok(result.sent >= 1);

// 3. Verify status changed to 'sent'
const after = db.prepare('SELECT status, attempts, sent_at, provider_message_id FROM email_outbox WHERE id = ?').get(testEmailId);
console.log('Email after processing:', after);
assert.equal(after.status, 'sent');
assert.equal(after.attempts, 1);
assert.ok(after.provider_message_id);

// Clean up test email
db.prepare('DELETE FROM email_outbox WHERE id = ?').run(testEmailId);
console.log('Outbox queue processing is GENUINE and fully operational.');

// Now import server/index.ts to verify it loads without error and unrefs outboxInterval
import('../../../server/index.ts').then((mod) => {
  console.log('server/index.ts loaded successfully.');
  console.log('Exiting probe naturally — if unref works, process will exit without hanging.');
});
