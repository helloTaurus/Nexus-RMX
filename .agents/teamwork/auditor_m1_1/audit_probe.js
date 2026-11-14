import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/nexus_recruitment.db');

console.log('=== SQLite Probe ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map((r) => r.name));

const empCount = db.prepare('SELECT count(*) as c FROM employees').get();
console.log('Employee count:', empCount.c);

const accCount = db.prepare('SELECT count(*) as c FROM employee_accounts').get();
console.log('Account count:', accCount.c);

const auditCount = db.prepare('SELECT count(*) as c FROM audit_events').get();
console.log('Audit events count:', auditCount.c);

const amina = db.prepare(`
  SELECT e.id, e.official_email, e.employment_status, ea.is_active 
  FROM employees e 
  LEFT JOIN employee_accounts ea ON e.id = ea.employee_id 
  WHERE e.official_email = ?
`).get('amina.bello@nexusfinance.com');
console.log('Dr Amina Bello:', JSON.stringify(amina));
