import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('='.repeat(80));
console.log('SUPABASE AUTHENTICATION TEST SUITE');
console.log('='.repeat(80));

const tests = [
  'test-env.js',
  'test-supabase-connection.js',
  'test-rls-bypass.js',
  'test-admin-operations.js',
  'compare-mcp-vs-sdk.js'
];

async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running: ${testFile}`);
    console.log('='.repeat(80));
    
    const child = spawn('node', [path.join(__dirname, testFile)], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.log(`\n⚠️  Test ${testFile} exited with code ${code}`);
      }
      resolve();
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ Failed to run ${testFile}:`, error);
      resolve();
    });
  });
}

async function runAllTests() {
  for (const test of tests) {
    await runTest(test);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('ALL TESTS COMPLETE');
  console.log('='.repeat(80));
  console.log(`
NEXT STEPS:
1. Review the test output above
2. Identify which exact step is failing
3. Fix the root cause
4. Update MIGRATION.md with the solution
  `);
}

runAllTests();