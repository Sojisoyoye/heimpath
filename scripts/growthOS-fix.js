#!/usr/bin/env node

/**
 * GrowthOS Fix Now → Taskmaster Integration
 *
 * Picks up pending fix requests from GrowthOS and creates Taskmaster tasks
 * in the HeimPath project so Claude Code can implement them via /ship.
 *
 * Usage:
 *   node scripts/growthOS-fix.js              — create tasks for all pending fixes
 *   node scripts/growthOS-fix.js --list       — list pending fix requests
 */

const fs = require('fs');
const path = require('path');

const GROWTHOS_API = process.env.GROWTHOS_API_URL || 'http://178.104.122.53:4000';
const TASKMASTER_DIR = path.resolve(__dirname, '../.taskmaster');
const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchPendingFixes() {
  const res = await fetchWithTimeout(`${GROWTHOS_API}/api/fix-requests?status=pending`);
  if (!res.ok) throw new Error(`GrowthOS API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected GrowthOS response shape: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

async function markAsTasked(fixRequestId, taskmasterTaskId) {
  const res = await fetchWithTimeout(`${GROWTHOS_API}/api/fix-request/${fixRequestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'tasked', taskmasterTaskId: String(taskmasterTaskId) }),
  });
  if (!res.ok) {
    throw new Error(`Failed to mark fix ${fixRequestId} as tasked: ${res.status} ${res.statusText}`);
  }
}

function readTasksFile() {
  const tasksPath = path.join(TASKMASTER_DIR, 'tasks', 'tasks.json');
  if (!fs.existsSync(tasksPath)) throw new Error(`tasks.json not found at ${tasksPath}`);
  try {
    return JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse tasks.json: ${e.message}`);
  }
}

function writeTasksFile(data) {
  const tasksPath = path.join(TASKMASTER_DIR, 'tasks', 'tasks.json');
  fs.writeFileSync(tasksPath, JSON.stringify(data, null, 2) + '\n');
}

function writeTaskTxtFile(task) {
  const taskId = String(task.id).padStart(3, '0');
  const taskPath = path.join(TASKMASTER_DIR, 'tasks', `task_${taskId}.txt`);
  // Indent embedded multi-line content so it doesn't create spurious '# ' section headers
  const indent = text => String(text).replace(/\n#/g, '\n  #');
  const lines = [
    `# Task ID: ${task.id}`,
    `# Title: ${task.title}`,
    `# Status: ${task.status}`,
    `# Dependencies: ${(task.dependencies || []).length > 0 ? task.dependencies.join(', ') : 'None'}`,
    `# Priority: ${task.priority}`,
    `# Description: ${task.description}`,
    `# Details:`,
    indent(task.details),
    `# Test Strategy:`,
    indent(task.testStrategy),
  ];
  fs.writeFileSync(taskPath, lines.join('\n') + '\n');
}

function isDuplicate(findingId, tasks) {
  return tasks.some(t => t.metadata && t.metadata.findingId === findingId);
}

function createTaskmasterTask(fixRequest, existingData) {
  const tasks = existingData.master.tasks;
  const maxId = tasks.reduce((max, t) => Math.max(max, parseInt(t.id, 10) || 0), 0);
  const nextId = String(maxId + 1);

  const severityPriority = { critical: 'high', high: 'high', medium: 'medium', low: 'low' };

  const task = {
    id: nextId,
    title: `[GrowthOS Fix] ${fixRequest.finding_title}`,
    description: `Fix audit finding from GrowthOS: ${fixRequest.finding_detail}`,
    details: [
      '## Source',
      'Created automatically by HeimPath GrowthOS v5 Fix Now integration.',
      `GrowthOS fix request ID: ${fixRequest.id}`,
      `Finding ID: ${fixRequest.finding_id}`,
      `Severity: ${fixRequest.finding_severity}`,
      '',
      '## Problem',
      fixRequest.finding_detail,
      '',
      '## Required Fix',
      fixRequest.finding_fix,
      '',
      '## Workflow',
      'Follow .claude/skills/ship/SKILL.md. Run pre-commit and tests before raising PR.',
      'Never push directly to main. Feature branch → PR → CI → merge.',
    ].join('\n'),
    testStrategy: `Verify the fix resolves: "${fixRequest.finding_title}". Run pre-commit run --all-files and the full test suite. Confirm no existing functionality is broken.`,
    priority: severityPriority[fixRequest.finding_severity] || 'medium',
    dependencies: [],
    status: 'pending',
    subtasks: [],
    metadata: {
      source: 'growthOS',
      growthosFixRequestId: fixRequest.id,
      findingId: fixRequest.finding_id,
      severity: fixRequest.finding_severity,
      createdAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  return { task, id: nextId };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    console.log('\nFetching pending fix requests from GrowthOS...\n');
    const fixes = await fetchPendingFixes();
    if (fixes.length === 0) {
      console.log('No pending fix requests. Click "Fix Now" in the GrowthOS dashboard first.');
      return;
    }
    console.log(`${fixes.length} pending fix request(s):\n`);
    fixes.forEach(f => {
      console.log(`  [${f.id}] ${(f.finding_severity || 'medium').toUpperCase()} — ${f.finding_title}`);
      console.log(`        Created: ${new Date(f.created_at).toLocaleString()}`);
    });
    console.log('');
    return;
  }

  console.log('\nFetching pending fix requests from GrowthOS API...');
  const fixes = await fetchPendingFixes();

  if (fixes.length === 0) {
    console.log('No pending fix requests. Click "Fix Now" in the GrowthOS dashboard first.');
    console.log(`GrowthOS dashboard: https://frontend-nu-five-28.vercel.app\n`);
    return;
  }

  console.log(`Found ${fixes.length} pending fix request(s).\n`);

  const existingData = readTasksFile();
  const newTasks = [];

  for (const fix of fixes) {
    if (isDuplicate(fix.finding_id, existingData.master.tasks)) {
      console.log(`  ⚠ Skipping duplicate: ${fix.finding_title} (finding_id already tasked)`);
      continue;
    }
    console.log(`Creating task for: ${fix.finding_title}`);
    const { task, id } = createTaskmasterTask(fix, existingData);
    // Push immediately so the next iteration sees the updated maxId
    existingData.master.tasks.push(task);
    newTasks.push({ fix, task, id });
  }

  if (newTasks.length === 0) {
    console.log('All fix requests already have Taskmaster tasks. Nothing to do.\n');
    return;
  }

  // Write tasks.json once with all new tasks, then notify GrowthOS concurrently.
  // If a markAsTasked call fails, the task already exists in tasks.json, so the
  // isDuplicate guard above prevents re-creation on the next run.
  existingData.meta.totalTasks = existingData.master.tasks.length;
  existingData.meta.updatedAt = new Date().toISOString();
  writeTasksFile(existingData);

  const results = await Promise.allSettled(
    newTasks.map(({ fix, task, id }) => {
      writeTaskTxtFile(task);
      return markAsTasked(fix.id, id).then(() => {
        console.log(`  ✓ Task #${id} created: ${task.title}`);
        console.log(`    Priority: ${task.priority}`);
      });
    })
  );

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      const { fix, id } = newTasks[i];
      console.warn(`  ⚠ Task #${id} written locally but GrowthOS PATCH failed: ${results[i].reason.message}`);
      console.warn(`    Fix request ${fix.id} stays 'pending' — re-run script to retry (dedup guard prevents duplicates).`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('Tasks created. Now implement them:');
  console.log('');
  console.log('  In Claude Code (HeimPath project):');
  console.log('  > /ship');
  console.log('');
  console.log('  Or target a specific task:');
  console.log('  > Read .claude/growthOS-fixes.md then implement the pending GrowthOS fix task');
  console.log('─────────────────────────────────────────────────────────\n');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
