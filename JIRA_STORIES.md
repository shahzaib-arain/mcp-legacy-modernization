# Jira Migration Backlog

**Epic**: Legacy C++ Application Modernization (NADRA-001)

This backlog defines the set of User Stories and technical tasks required to replace the legacy C++ console-based NADRA Management System with a modern containerized Full-Stack Web Application.

---

## Story 1: Admin Authentication (NADRA-101)

### Title
Admin Authentication System

### User Story
```text
As a System Administrator,
I want to log into a secure dashboard,
so that I can access and manage sensitive citizen records safely.
```

### Acceptance Criteria
- User must be presented with a modern login screen.
- Username and password must be validated on the backend.
- A successful login must return a JWT (JSON Web Token) with an expiration.
- Unauthenticated requests to API endpoints (except login) must be blocked with `401 Unauthorized`.
- Admin sessions can be ended (logout).

### Technical Tasks
- **Backend Tasks**:
  - Create the `Admin` database model in Prisma schema.
  - Implement `/api/auth/login` and `/api/auth/register` endpoints.
  - Set up JWT signing and verification middleware (`authMiddleware`).
  - Hash passwords using `bcryptjs` before storage.
- **Frontend Tasks**:
  - Implement React AuthContext and private routes.
  - Create a login UI with Tailwind CSS.
  - Handle token storage (localStorage) and session expiry.
- **Testing Tasks**:
  - Write integration tests for register/login endpoints.
  - Mock authentications to test protected routes.

---

## Story 2: Citizen Records Dashboard & Stats (NADRA-102)

### Title
Citizen Management Dashboard and Statistics

### User Story
```text
As a System Administrator,
I want to see a summary of system statistics (total records, marital status distribution),
so that I get a quick overview of citizen registration metrics.
```

### Acceptance Criteria
- Dashboard landing page shows total number of citizen records in the system.
- Dashboard shows visual counts/breakdown of marital statuses (Single, Married, Divorced, Widowed, etc.).
- Statistics must update dynamically in real time when records are created or deleted.

### Technical Tasks
- **Backend Tasks**:
  - Implement `/api/records/stats` API endpoint returning total count and a group-by query of marital status distribution.
- **Frontend Tasks**:
  - Design a dashboard layout with summary cards.
  - Render a clean grid and charts/visual blocks for status distribution.
- **Testing Tasks**:
  - Verify that statistics API counts match actual rows in PostgreSQL.

---

## Story 3: Citizen Records Directory Grid (NADRA-103)

### Title
Citizen Directory with Search and Pagination

### User Story
```text
As a System Administrator,
I want to browse all citizen records in a paginated grid and search by Name or NIC,
so that I can quickly locate specific citizens without overloading system memory.
```

### Acceptance Criteria
- Records must load dynamically using server-side pagination (default 10 records per page).
- A search input allows filtering records by name, NIC, father NIC, or mother name.
- Search must query the backend using database indexes for high performance.
- Display clean loading/empty/error states.

### Technical Tasks
- **Backend Tasks**:
  - Add query parameters (`page`, `limit`, `search`) to the `GET /api/records` route.
  - Add index to the `nic` column in Prisma schema.
  - Perform dynamic searching using Prisma's `contains` or OR-queries.
- **Frontend Tasks**:
  - Create a paginated table component.
  - Add search input with a debounce timer to reduce API thrashing.
  - Show page navigation controls (Next, Prev, Current page index).
- **Testing Tasks**:
  - Write integration tests checking search queries and page offsets.

---

## Story 4: Citizen Record Creation with Age Validation (NADRA-104)

### Title
Citizen Registration (NIC Creation) with Age Gate

### User Story
```text
As a System Administrator,
I want to register a new citizen NIC card,
so that I can add new eligible citizens (age 18+) into the national database.
```

### Acceptance Criteria
- Create modal popup form in React with input fields for: Name, NIC, Father NIC, Mother Name, Birth Certificate, Resident Form, and Marital Status.
- Validate that the applicant is at least 18 years old (validated via UI prompt or birthdate input).
- Enforce unique NIC validation: returning a clean error if an NIC is already registered.
- Save records dynamically to PostgreSQL and reload the grid.

### Technical Tasks
- **Backend Tasks**:
  - Implement `POST /api/records` endpoint with Zod schema validation.
  - Perform validation on the backend to check if the NIC already exists in the database.
  - Check validation rules for all fields.
- **Frontend Tasks**:
  - Build the creation modal with state management and error displays.
  - Implement validation using a form library or custom state.
- **Testing Tasks**:
  - Test registration API for failure cases (duplicate NIC, missing required fields).

---

## Story 5: Modify & Remove Citizen Records (NADRA-105)

### Title
Update and Delete Citizen Records

### User Story
```text
As a System Administrator,
I want to modify a citizen's details or remove a record completely,
so that the national database remains up-to-date and free from mistakes or obsolete entries.
```

### Acceptance Criteria
- Select a record to open an Edit Modal pre-populated with current details.
- Editing the NIC of an existing citizen must verify it doesn't conflict with another citizen.
- Deleting a specific record prompts the user with a confirmation modal.
- Provide a bulk delete option to delete all records (with a secure confirmation keyword).

### Technical Tasks
- **Backend Tasks**:
  - Implement `PUT /api/records/:nic` endpoint to update database values.
  - Implement `DELETE /api/records/:nic` to remove a single row.
  - Implement `DELETE /api/records` to purge all rows.
- **Frontend Tasks**:
  - Design Edit Modal and integrate with update API.
  - Add confirm dialogs for single delete and bulk delete.
- **Testing Tasks**:
  - Write backend integration tests for updates and deletes.
  - Verify that foreign key constraints/indexes remain intact.

---

## Story 6: Citizen NIC Application Flow (NADRA-106)

### Title
Citizen NIC Application Form (No Manual NIC Input)

### User Story
```text
As a Citizen User,
I want to apply for a new NIC card by filling out my details without manual NIC input,
so that the authority can verify my request and automatically generate a unique NIC for me.
```

### Acceptance Criteria
- User cannot manually input an NIC number.
- User fills out: Name, Father/Relative NIC, Mother's Name, Birth Certificate No, Resident Form No, Marital Status, and Age (validated 18+).
- Application appears in the Citizen's dashboard table with status `PENDING_MANAGER` and "Pending assignment" for the NIC.

### Technical Tasks
- **Backend Tasks**:
  - Implement request validation schema without `nic` requirement.
  - Implement request creation endpoint mapping to `PENDING_MANAGER` status.
- **Frontend Tasks**:
  - Build application modal with fields (no `nic` field).
  - Add Citizen Applications table in Dashboard showing tracking status.

---

## Story 7: Manager Review and Verification (NADRA-107)

### Title
Manager Request Verification Queue

### User Story
```text
As a Verification Manager,
I want to browse and review pending citizen applications,
so that I can verify and forward valid ones to the Administrator or reject invalid ones.
```

### Acceptance Criteria
- Manager can view a queue of all requests in `PENDING_MANAGER` status.
- Manager can review full details of an application.
- Manager can click "Verify & Forward to Admin" to promote status to `PENDING_ADMIN`.
- Manager can click "Reject" to set status to `REJECTED`.

### Technical Tasks
- **Backend Tasks**:
  - Implement `PUT /api/requests/:id/verify-manager` endpoint.
  - Implement `PUT /api/requests/:id/reject` endpoint.
- **Frontend Tasks**:
  - Build Manager Dashboard queue table.
  - Create review modal with Verify and Reject action handlers.

---

## Story 8: Admin Final Approval & Auto-NIC Generation (NADRA-108)

### Title
Admin Request Approval & Unique NIC Auto-Generation

### User Story
```text
As a System Administrator,
I want to approve manager-verified requests and automatically generate a unique NIC number,
so that the citizen is registered in the official national database.
```

### Acceptance Criteria
- Admin can browse a queue of all requests in `PENDING_ADMIN` status.
- Clicking "Approve & Generate NIC" opens a confirmation modal.
- Approving automatically generates a unique 13-digit NIC in format `XXXXX-XXXXXXX-X` and creates the `CitizenRecord` in the database.
- The record in the directory is flagged as "Verified" and displays the name of the verifying Manager.

### Technical Tasks
- **Backend Tasks**:
  - Implement `PUT /api/requests/:id/verify-admin` endpoint.
  - Implement unique 13-digit Pakistani NIC generation utility checking DB uniqueness.
  - Register `CitizenRecord` in transactional boundary.
- **Frontend Tasks**:
  - Add "Manager Requests" tab to Admin Dashboard.
  - Build confirmation modal for NIC generation and final approval.

