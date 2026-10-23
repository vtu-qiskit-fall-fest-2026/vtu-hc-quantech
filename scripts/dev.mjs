import { spawn } from 'child_process';
import process from 'process';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  🚀 Starting QuantumLearnAI Dev Environment (Backend + Frontend)');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');

const isWindows = process.platform === 'win32';
const pyCmd = isWindows ? 'python' : 'python3';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Start Python FastAPI Backend on Port 8000
console.log('\x1b[34m%s\x1b[0m', '[Backend] Launching FastAPI server on http://127.0.0.1:8000...');
const backendCmd = `${pyCmd} -m backend.main`;
const backend = spawn(backendCmd, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' }
});

backend.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[Backend Error] Failed to start Python backend: ${err.message}`);
  console.log('\x1b[33m%s\x1b[0m', '[Backend Info] Frontend will continue in resilient offline mode.');
});

// 2. Start Vite Dev Server
console.log('\x1b[32m%s\x1b[0m', '[Frontend] Launching Vite development server...');
const frontendCmd = `${npmCmd} run dev:frontend`;
const frontend = spawn(frontendCmd, {
  stdio: 'inherit',
  shell: true
});

frontend.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `[Frontend Error] Failed to start Vite: ${err.message}`);
});

function cleanup() {
  console.log('\n[System] Shutting down development processes...');
  try {
    if (backend && backend.pid) {
      if (isWindows) {
        spawn('taskkill', ['/pid', backend.pid.toString(), '/f', '/t']);
      } else {
        backend.kill('SIGTERM');
      }
    }
  } catch (_) {}
  try {
    if (frontend && frontend.pid) {
      if (isWindows) {
        spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']);
      } else {
        frontend.kill('SIGTERM');
      }
    }
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
