import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else if (fs.existsSync('backend/.env')) {
  dotenv.config({ path: 'backend/.env' });
}

const JIRA_HOST = process.env.JIRA_HOST || 'https://shahzaibarain0080.atlassian.net';
const JIRA_EMAIL = process.env.JIRA_EMAIL || 'shahzaibarain.0080@gmail.com';
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_API_TOKEN) {
  console.error('ERROR: JIRA_API_TOKEN environment variable is not defined.');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function jiraRequest(method, path, body = null) {
  const url = `${JIRA_HOST}/rest/api/3${path}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Jira API ${method} ${path} failed: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function getProjectKey() {
  console.log('Fetching Jira projects...');
  const projects = await jiraRequest('GET', '/project');
  const existing = projects.find(p => p.key === 'NADRA' || p.name.includes('NADRA'));
  if (existing) {
    console.log(`Using existing project: ${existing.key}`);
    return existing.key;
  }
  
  // Create project if missing
  console.log('Project NADRA not found. Creating...');
  const myself = await jiraRequest('GET', '/myself');
  const newProj = await jiraRequest('POST', '/project', {
    key: 'NADRA',
    name: 'NADRA Management System Modernization',
    projectTypeKey: 'software',
    leadAccountId: myself.accountId,
    description: 'Legacy C++ to Node.js/React/PostgreSQL migration project'
  });
  console.log(`Created project: ${newProj.key}`);
  return newProj.key;
}

async function createIssue(projectKey, summary, description, issueTypeId, labels = [], parentKey = null) {
  const fields = {
    project: { key: projectKey },
    summary,
    description: {
      version: 1,
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: description }]
      }]
    },
    issuetype: { id: issueTypeId },
    labels
  };

  if (parentKey) {
    fields.parent = { key: parentKey };
  }

  const issue = await jiraRequest('POST', '/issue', { fields });
  return issue;
}

const stories = [
  {
    summary: '[NADRA-101] Admin Authentication System',
    description: 'As a System Administrator, I want to log into a secure dashboard, so that I can access and manage sensitive citizen records safely.',
    labels: ['authentication', 'functional'],
    testCases: [
      'Test Case: Login page renders all required UI elements correctly',
      'Test Case: Login with valid credentials redirects to dashboard',
      'Test Case: Login with invalid credentials displays validation error',
      'Test Case: Login validation prevents empty username or password',
      'Test Case: Auth guard blocks unauthenticated access to dashboard',
      'Test Case: Clicking logout clears session and redirects to sign in'
    ]
  },
  {
    summary: '[NADRA-102] Citizen Management Dashboard and Statistics',
    description: 'As a System Administrator, I want to see a summary of system statistics so that I get a quick overview of citizen registration metrics.',
    labels: ['dashboard', 'statistics', 'functional'],
    testCases: [
      'Test Case: Dashboard displays total citizen count card correctly',
      'Test Case: Dashboard displays marital status breakdown stats dynamically'
    ]
  },
  {
    summary: '[NADRA-103] Citizen Directory with Search and Pagination',
    description: 'As a System Administrator, I want to browse all citizen records in a paginated grid and search by Name or NIC so that I can quickly locate specific citizens.',
    labels: ['search', 'pagination', 'directory', 'functional'],
    testCases: [
      'Test Case: Directory grid displays paginated list of registered citizens',
      'Test Case: Search filters citizen registry correctly by name or NIC'
    ]
  },
  {
    summary: '[NADRA-104] Citizen Registration with Age Validation',
    description: 'As a System Administrator, I want to register a new citizen NIC card so that I can add new eligible citizens (18+) into the national database.',
    labels: ['registration', 'validation', 'age-gate', 'functional'],
    testCases: [
      'Test Case: Open citizen registration modal correctly',
      'Test Case: Register citizen succeeds with valid details',
      'Test Case: Register citizen fails when age is under 18',
      'Test Case: Register citizen fails with duplicate NIC'
    ]
  },
  {
    summary: '[NADRA-105] Update and Delete Citizen Records',
    description: 'As a System Administrator, I want to modify a citizen\'s details or remove a record completely so that the national database remains up-to-date.',
    labels: ['update', 'delete', 'crud', 'functional'],
    testCases: [
      'Test Case: Edit citizen modal updates record and persists changes',
      'Test Case: Delete citizen removes record from registry',
      'Test Case: Purge registry deletes all records with confirmation keyword'
    ]
  },
  {
    summary: '[NADRA-106] Citizen NIC Application Flow',
    description: 'As a Citizen User, I want to apply for a new NIC card by filling out my details without manual NIC input, so that the authority can verify my request and automatically generate a unique NIC for me.',
    labels: ['citizen-request', 'rbac', 'functional'],
    testCases: [
      'Test Case: Citizen submits application form without NIC input successfully',
      'Test Case: Submitted request appears in Citizen dashboard with PENDING_MANAGER status'
    ]
  },
  {
    summary: '[NADRA-107] Manager Review and Verification',
    description: 'As a Verification Manager, I want to browse and review pending citizen applications, so that I can verify and forward valid ones to the Administrator or reject invalid ones.',
    labels: ['manager-queue', 'rbac', 'functional'],
    testCases: [
      'Test Case: Manager queue displays PENDING_MANAGER requests correctly',
      'Test Case: Manager verifies and forwards request to Admin (status updates to PENDING_ADMIN)',
      'Test Case: Manager rejects request (status updates to REJECTED)'
    ]
  },
  {
    summary: '[NADRA-108] Admin Final Approval & Auto-NIC Generation',
    description: 'As a System Administrator, I want to approve manager-verified requests and automatically generate a unique NIC number, so that the citizen is registered in the official database.',
    labels: ['admin-approval', 'rbac', 'functional'],
    testCases: [
      'Test Case: Admin dashboard displays PENDING_ADMIN requests under Manager Requests tab',
      'Test Case: Admin approves request, confirms auto-generation of unique NIC',
      'Test Case: Approved request creates citizen record showing verifying manager name'
    ]
  },
  {
    summary: '[NADRA-201] Non-Functional Performance and Load Checks',
    description: 'Verify system loading times and concurrency behavior.',
    labels: ['non-functional', 'performance', 'load'],
    testCases: [
      'Test Case: Performance - Dashboard load meets FCP and LCP benchmarks',
      'Test Case: Load - System handles concurrent request submissions under load'
    ]
  },
  {
    summary: '[NADRA-202] Non-Functional Accessibility and Security Checks',
    description: 'Verify accessibility standards and endpoint security guards.',
    labels: ['non-functional', 'accessibility', 'security'],
    testCases: [
      'Test Case: Accessibility - UI passes WCAG 2.1 AA audits using Axe-core',
      'Test Case: Security - Auth guards reject unauthenticated/unauthorized role actions'
    ]
  }
];

async function main() {
  try {
    const projectKey = await getProjectKey();
    
    // Fetch existing tasks in project
    console.log('\nSearching for existing stories in project...');
    const searchRes = await jiraRequest('GET', `/search/jql?jql=project=${projectKey} AND issuetype=Task&maxResults=100`);
    const existingIssues = searchRes.issues || [];
    
    console.log(`Found ${existingIssues.length} existing stories.`);

    for (const story of stories) {
      let storyKey = null;
      const matched = existingIssues.find(i => i.fields?.summary?.includes(story.summary.split(']')[0] + ']') || i.fields?.summary === story.summary);
      
      if (matched) {
        storyKey = matched.key;
        console.log(`Story already exists: ${storyKey} (${story.summary})`);
      } else {
        console.log(`Creating story: ${story.summary}...`);
        const newIssue = await createIssue(projectKey, story.summary, story.description, '10037', story.labels); // 10037 = Task
        storyKey = newIssue.key;
        console.log(`  Created: ${storyKey}`);
      }

      // Check existing subtasks for this story
      const subtaskSearch = await jiraRequest('GET', `/search/jql?jql=parent=${storyKey} AND issuetype=Sub-task`);
      const existingSubtasks = subtaskSearch.issues || [];

      for (const tc of story.testCases) {
        const subMatched = existingSubtasks.find(s => s.fields?.summary === tc);
        if (subMatched) {
          console.log(`  Test Case already exists: ${subMatched.key} -> ${tc}`);
        } else {
          console.log(`  Creating Test Case: ${tc}...`);
          const subtask = await createIssue(projectKey, tc, tc, '10038', ['test-case'], storyKey); // 10038 = Sub-task
          console.log(`    Created: ${subtask.key}`);
        }
      }
    }
    
    console.log('\n✅ Jira synchronization complete!');
  } catch (err) {
    console.error('❌ Jira synchronization failed:', err.message);
    process.exit(1);
  }
}

main();
