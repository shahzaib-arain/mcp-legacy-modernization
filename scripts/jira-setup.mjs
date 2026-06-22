import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load local environment variables if present
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

async function getProjects() {
  console.log('Fetching Jira projects...');
  const data = await jiraRequest('GET', '/project');
  if (Array.isArray(data) && data.length > 0) {
    console.log('Available projects:');
    data.forEach(p => console.log(`  - ${p.key}: ${p.name}`));
    return data;
  }
  console.log('No projects found, will create one.');
  return [];
}

async function createProject() {
  console.log('Creating NADRA project in Jira...');
  // First get account ID for lead
  const myself = await jiraRequest('GET', '/myself');
  const accountId = myself.accountId;
  console.log(`Using account: ${myself.displayName} (${accountId})`);

  const project = await jiraRequest('POST', '/project', {
    key: 'NADRA',
    name: 'NADRA Management System Modernization',
    projectTypeKey: 'software',
    leadAccountId: accountId,
    description: 'Legacy C++ to Node.js/React/PostgreSQL migration project'
  });
  console.log(`Created project: ${project.key} - ${project.name}`);
  return project;
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
  console.log(`  Created [Type ID ${issueTypeId}] ${issue.key}: ${summary}`);
  return issue;
}

const stories = [
  {
    summary: '[NADRA-101] Admin Authentication System',
    description: 'As a System Administrator, I want to log into a secure dashboard so that I can access and manage sensitive citizen records safely.\n\nAcceptance Criteria:\n- Login screen with username/password\n- JWT token returned on success\n- Unauthenticated API requests blocked with 401\n- Admin logout support\n\nTechnical Tasks:\n- POST /api/auth/login endpoint\n- POST /api/auth/register endpoint\n- JWT middleware for route protection\n- bcrypt password hashing\n- React AuthContext and login UI',
    labels: ['authentication', 'backend', 'frontend']
  },
  {
    summary: '[NADRA-102] Citizen Management Dashboard and Statistics',
    description: 'As a System Administrator, I want to see a summary of system statistics so that I get a quick overview of citizen registration metrics.\n\nAcceptance Criteria:\n- Total citizen count displayed\n- Marital status breakdown (married, single, divorced, widowed)\n- Statistics update when records change\n\nTechnical Tasks:\n- GET /api/records/stats endpoint\n- PostgreSQL GROUP BY query for status distribution\n- React stats cards component',
    labels: ['dashboard', 'statistics', 'frontend']
  },
  {
    summary: '[NADRA-103] Citizen Directory with Search and Pagination',
    description: 'As a System Administrator, I want to browse all citizen records in a paginated grid and search by Name or NIC so that I can quickly locate specific citizens.\n\nAcceptance Criteria:\n- Server-side pagination (default 10 per page)\n- Search by name, NIC, father NIC, mother name\n- Loading, empty, and error states\n\nTechnical Tasks:\n- GET /api/records?page=&limit=&search= endpoint\n- Prisma contains/OR search queries\n- React paginated table with debounced search',
    labels: ['search', 'pagination', 'directory']
  },
  {
    summary: '[NADRA-104] Citizen Registration with Age Validation',
    description: 'As a System Administrator, I want to register a new citizen NIC card so that I can add new eligible citizens (18+) into the national database.\n\nAcceptance Criteria:\n- Creation form with all required fields\n- Age gate: must be 18+ to register\n- Unique NIC enforcement\n- Immediate grid refresh on creation\n\nTechnical Tasks:\n- POST /api/records endpoint with Zod validation\n- Age >= 18 check at backend\n- Unique NIC check before insert\n- React modal form with field validation',
    labels: ['registration', 'validation', 'age-gate']
  },
  {
    summary: '[NADRA-105] Update and Delete Citizen Records',
    description: 'As a System Administrator, I want to modify a citizen\'s details or remove a record completely so that the national database remains up-to-date.\n\nAcceptance Criteria:\n- Edit modal pre-populated with existing data\n- New NIC cannot conflict with another citizen\n- Single delete with confirmation dialog\n- Bulk delete with keyword confirmation "DELETE ALL"\n\nTechnical Tasks:\n- PUT /api/records/:nic endpoint\n- DELETE /api/records/:nic endpoint\n- DELETE /api/records bulk delete endpoint\n- React Edit and Delete confirmation modals',
    labels: ['update', 'delete', 'crud']
  }
];

async function main() {
  try {
    let projects = await getProjects();
    let projectKey;
    
    const existing = projects.find(p => p.key === 'NADRA' || p.name.includes('NADRA'));
    if (existing) {
      projectKey = existing.key;
      console.log(`Using existing project: ${projectKey}`);
    } else {
      try {
        const newProject = await createProject();
        projectKey = newProject.key;
      } catch (e) {
        // If project creation fails, use first available project
        if (projects.length > 0) {
          projectKey = projects[0].key;
          console.log(`Using first available project: ${projectKey}`);
        } else {
          throw new Error('No projects available and could not create one: ' + e.message);
        }
      }
    }

    // Create Epic first (using Task ID: 10037)
    console.log(`\nCreating Epic in project ${projectKey}...`);
    let epicKey = null;
    try {
      const epic = await createIssue(
        projectKey,
        'Legacy C++ Application Modernization — NADRA System',
        'Modernize the legacy C++ NADRA Management System to a full-stack Node.js/React/PostgreSQL web application with Docker containerization, JWT authentication, REST API, and comprehensive test coverage.',
        '10037', // Task ID
        ['migration', 'modernization', 'legacy']
      );
      epicKey = epic.key;
    } catch (e) {
      console.log(`Could not create Epic: ${e.message}`);
    }

    // Create Stories (using Task ID: 10037)
    console.log('\nCreating User Stories...');
    const createdIssues = [];
    for (const story of stories) {
      const issue = await createIssue(projectKey, story.summary, story.description, '10037', story.labels); // 10037 = Task (acting as Story)
      createdIssues.push(issue);
    }

    // Create Sub-tasks linked to Stories (using Sub-task ID: 10038)
    console.log('\nCreating Technical Sub-tasks...');
    const subtasks = [
      { parent: createdIssues[0].key, summary: 'Implement JWT authentication middleware (authMiddleware.ts)' },
      { parent: createdIssues[0].key, summary: 'Create bcrypt password hashing on admin registration' },
      { parent: createdIssues[0].key, summary: 'Build React login page with AuthContext' },
      { parent: createdIssues[1].key, summary: 'Create GET /api/records/stats with GROUP BY marital status' },
      { parent: createdIssues[2].key, summary: 'Add server-side pagination with page/limit query params' },
      { parent: createdIssues[2].key, summary: 'Add full-text search with Prisma OR query' },
      { parent: createdIssues[3].key, summary: 'Implement Zod age validation (must be >= 18)' },
      { parent: createdIssues[3].key, summary: 'Enforce unique NIC constraint at DB level' },
      { parent: createdIssues[4].key, summary: 'PUT /api/records/:nic with NIC conflict check' },
      { parent: createdIssues[4].key, summary: 'DELETE /api/records bulk purge with keyword confirmation' }
    ];

    for (const sub of subtasks) {
      try {
        await createIssue(projectKey, sub.summary, sub.summary, '10038', ['technical-task'], sub.parent); // 10038 = Sub-task
      } catch (e) {
        console.log(`  Subtask skipped for parent ${sub.parent}: ${e.message.slice(0, 80)}`);
      }
    }

    console.log('\n✅ Jira setup complete!');
    console.log(`📋 Project: ${JIRA_HOST}/jira/software/projects/${projectKey}/boards`);
    if (epicKey) console.log(`🏔️  Epic: ${epicKey}`);
    createdIssues.forEach(i => console.log(`📌 Story: ${i.key} — ${JIRA_HOST}/browse/${i.key}`));

  } catch (err) {
    console.error('❌ Jira setup failed:', err.message);
    process.exit(1);
  }
}

main();
