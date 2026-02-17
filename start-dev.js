#!/usr/bin/env node
// Simple dev server starter

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting AURELLE Development Server...\n');

const child = spawn('tsx', ['watch', 'server/index.ts'], {
  cwd: path.resolve(__dirname),
  stdio: 'inherit',
  shell: true,
});

child.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start development server:', err);
  process.exit(1);
});
