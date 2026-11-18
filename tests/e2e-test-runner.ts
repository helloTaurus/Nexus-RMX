import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface TierSpec {
  tier: string;
  name: string;
  file: string;
  targetScope: string;
  minRequired: number;
}

interface TierResult {
  tier: string;
  name: string;
  file: string;
  targetScope: string;
  minRequired: number;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  status: 'PASS' | 'FAIL';
  errors: string[];
}

const TIERS: TierSpec[] = [
  {
    tier: 'Tier 1',
    name: 'Feature Coverage (Equivalence)',
    file: 'tests/tier1-feature-coverage.test.ts',
    targetScope: 'F01-F17 (17 features)',
    minRequired: 85
  },
  {
    tier: 'Tier 2',
    name: 'Boundary, Corner & Adversarial',
    file: 'tests/tier2-boundary-corner.test.ts',
    targetScope: 'F01-F17 (17 features)',
    minRequired: 85
  },
  {
    tier: 'Tier 3',
    name: 'Cross-Feature Integration',
    file: 'tests/tier3-cross-feature.test.ts',
    targetScope: 'Pairwise combinations (18)',
    minRequired: 17
  },
  {
    tier: 'Tier 4',
    name: 'Real-World Workload Scenarios',
    file: 'tests/tier4-application-scenarios.test.ts',
    targetScope: 'Full-Scale Workloads (5)',
    minRequired: 5
  }
];

function runTier(spec: TierSpec): Promise<TierResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const args = ['tsx', '--test', spec.file];
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npx.cmd' : 'npx';

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' },
      shell: isWindows
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      const combined = stdout + '\n' + stderr;

      // Parse node:test output
      // Count passes (✔ or "ok") and fails (✖ or "not ok")
      let passCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      const lines = combined.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Check for test result markers
        if (trimmed.startsWith('✔ ') || trimmed.startsWith('ok ') && !trimmed.startsWith('ok 1 - tests/')) {
          passCount++;
        } else if (trimmed.startsWith('✖ ') || trimmed.startsWith('not ok ') && !trimmed.startsWith('not ok 1 - tests/')) {
          failCount++;
          errors.push(trimmed);
        }
      }

      // If child exited with 0 and counted 0/0, inspect TAP summary
      const passMatch = combined.match(/pass\s+(\d+)/i);
      const failMatch = combined.match(/fail\s+(\d+)/i);
      if (passMatch) {
        passCount = parseInt(passMatch[1], 10);
      }
      if (failMatch) {
        failCount = parseInt(failMatch[1], 10);
      }

      const total = passCount + failCount;
      const status: 'PASS' | 'FAIL' = (code === 0 && failCount === 0 && total >= spec.minRequired) ? 'PASS' : 'FAIL';

      resolve({
        ...spec,
        total,
        passed: passCount,
        failed: failCount,
        durationMs,
        status,
        errors: errors.slice(0, 10)
      });
    });

    child.on('error', (err) => {
      resolve({
        ...spec,
        total: 0,
        passed: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
        status: 'FAIL',
        errors: [`Execution error: ${err.message}`]
      });
    });
  });
}

function pad(str: string | number, length: number, alignRight: boolean = false): string {
  const s = String(str);
  if (s.length >= length) return s.slice(0, length);
  const diff = length - s.length;
  return alignRight ? ' '.repeat(diff) + s : s + ' '.repeat(diff);
}

async function main() {
  console.log('\n' + '='.repeat(105));
  console.log('              REMIX NEXUS FINANCE — E2E TEST SUITE RUNNER (TIERS 1-4)');
  console.log('              Target Framework: Node 24 native runner (`node:test`, `tsx`)');
  console.log('='.repeat(105) + '\n');

  const results: TierResult[] = [];
  const globalStartTime = Date.now();

  for (const spec of TIERS) {
    process.stdout.write(`Running ${spec.tier}: ${spec.name}... `);
    const res = await runTier(spec);
    console.log(`completed in ${(res.durationMs / 1000).toFixed(2)}s (${res.passed} passed, ${res.failed} failed)`);
    results.push(res);
  }

  const globalDuration = ((Date.now() - globalStartTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(105));
  console.log(
    pad('Tier', 8) +
    pad('Suite Name', 32) +
    pad('Target Scope', 28) +
    pad('Req.', 7, true) +
    pad('Exec.', 8, true) +
    pad('Pass', 7, true) +
    pad('Fail', 7, true) +
    '  ' + pad('Status', 6)
  );
  console.log('-'.repeat(105));

  let totalMin = 0;
  let totalExec = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let allPassed = true;

  for (const r of results) {
    totalMin += r.minRequired;
    totalExec += r.total;
    totalPassed += r.passed;
    totalFailed += r.failed;
    if (r.status !== 'PASS') {
      allPassed = false;
    }

    console.log(
      pad(r.tier, 8) +
      pad(r.name, 32) +
      pad(r.targetScope, 28) +
      pad(`≥${r.minRequired}`, 7, true) +
      pad(r.total, 8, true) +
      pad(r.passed, 7, true) +
      pad(r.failed, 7, true) +
      '  ' + (r.status === 'PASS' ? '✅ PASS' : '❌ FAIL')
    );
  }

  console.log('-'.repeat(105));
  console.log(
    pad('TOTAL', 8) +
    pad('All 4 Tiers Combined', 32) +
    pad('17 Features + Workloads', 28) +
    pad(`≥${totalMin}`, 7, true) +
    pad(totalExec, 8, true) +
    pad(totalPassed, 7, true) +
    pad(totalFailed, 7, true) +
    '  ' + (allPassed ? '✅ PASS' : '❌ FAIL')
  );
  console.log('='.repeat(105));
  console.log(`Execution Time: ${globalDuration}s | Total Tests Identified: ${totalExec} / Required Minimum: ${totalMin}\n`);

  if (!allPassed) {
    console.log('Pending Feature Coverage & Milestone Implementation Status:');
    for (const r of results) {
      if (r.failed > 0) {
        console.log(`\n[${r.tier}] ${r.name} (${r.failed} pending implementations):`);
        for (const err of r.errors.slice(0, 5)) {
          console.log(`  ${err}`);
        }
        if (r.errors.length > 5) {
          console.log(`  ... and ${r.errors.length - 5} more pending feature checks`);
        }
      }
    }
    console.log('\n(Note: Tests for pending milestone components M1-M4 will turn green as downstream workers complete implementation)\n');
    process.exit(1);
  } else {
    console.log('🎉 ALL 4 E2E TEST TIERS PASSED 100% WITH ZERO FAILURES!\n');
    process.exit(0);
  }
}

// Execute main if run directly
const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('e2e-test-runner.ts')
);

if (isMain) {
  main().catch((err) => {
    console.error('Fatal error in E2E runner:', err);
    process.exit(1);
  });
}

export { runTier, TIERS };
