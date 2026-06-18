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

const GROWTHOS_API = process.env.GROWTHOS_API_URL || 'http://178.104.122.53:4000';
const TASKMASTER_DIR = __dirname + '/../.taskmaster';

const fs = require('fs');
const path = require('path');

async function fetchPendingFixes() {
  const res = await fetch(`${GROWTHOS_API}/api/fix-requests?status=pending`);
  if (!res.ok) throw new Error(`GrowthOS API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function markAsTasked(fixRequestId, taskmasterTaskId) {
  await fetch(`${GROWTHOS_API}/api/fix-request/${fixRequestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'tasked', taskmasterTaskId: String(taskmasterTaskId) }),
  });
}

function readTasksFile() {
  const tasksPath = path.join(TASKMASTER_DIR, 'tasks', 'tasks.json');
  if (!fs.existsSync(tasksPath)) throw new Error(`tasks.json not found at ${tasksPath}`);
  return JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
}

function writeTasksFile(data) {
  const tasksPath = path.join(TASKMASTER_DIR, 'tasks', 'tasks.json');
  fs.writeFileSync(tasksPath, JSON.stringify(data, null, 2));
}

function writeTaskTxtFile(task) {
  const taskId = String(task.id).padStart(3, '0');
  const taskPath = path.join(TASKMASTER_DIR, 'tasks', `task_${taskId}.txt`);
  const lines = [
    `# Task ID: ${task.id}`,
    `# Title: ${task.title}`,
    `# Status: ${task.status}`,
    `# Dependencies: ${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}`,
    `# Priority: ${task.priority}`,
    `# Description: ${task.description}`,
    `# Details:`,
    task.details,
    `# Test Strategy:`,
    task.testStrategy,
  ];
  fs.writeFileSync(taskPath, lines.join('\n'));
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

  for (const fix of fixes) {
    console.log(`Creating task for: ${fix.finding_title}`);
    const { task, id } = createTaskmasterTask(fix, existingData);

    existingData.master.tasks.push(task);
    existingData.meta.totalTasks = existingData.master.tasks.length;
    existingData.meta.updatedAt = new Date().toISOString();

    writeTasksFile(existingData);
    writeTaskTxtFile(task);
    await markAsTasked(fix.id, id);

    console.log(`  ✓ Task #${id} created: ${task.title}`);
    console.log(`    Priority: ${task.priority}`);
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
