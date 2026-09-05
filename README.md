# Vision71 – Reusable B2B Asset Tracking Foundation

A production-grade, multi-tenant B2B asset tracking mini-platform built according to the **Vision71 Technologies Architecture Specification Document**.

This platform enables companies to register and track assets, generate unique 64-character encrypted QR codes, scan them securely using any standard phone camera without exposing internal database IDs or employee PII, assign assets to personnel or facilities, maintain strict status lifecycle transitions, and record an append-only audit history log.

---

## 1. System Architecture & Overview

### Backend Architecture
- **Framework**: Express.js (Node.js ES Modules)
- **Database**: MongoDB with Mongoose ODM (configured for Atlas connection string)
- **Validation**: Zod schema validation (returning HTTP 422 with structured field errors)
- **Security & RBAC**:
  - JWT Authentication with tenant status checking (`req.user: { userId, tenantId, role }`).
  - Role-based access control (`Admin` vs `Viewer`).
  - Field-level stripping: `passwordHash`, `tenantId`, and `_id` are never leaked.
  - Public scans sanitize all internal IDs and employee contact information (`AC 1`).
- **QR Engine**:
  - 64-character lowercase hex tokens generated via `crypto.randomBytes(32).toString('hex')` (256-bit entropy, unguessable).
  - 300x300 PNG Data URL generator via `qrcode` package.
- **Audit Trail (`AssetHistory`)**:
  - Append-only collection recording: `Created`, `StatusChange`, `AssignedToEmployee`, `AssignedToLocation`, `Unassigned`, and `Updated`.
  - Service layer strictly prevents any update or delete operations on history.

### Frontend Architecture
- **Framework**: React (Vite SPA) with modern CSS design tokens, glassmorphism, responsive table layouts, modal flows, and interactive state management.
- **Public Scan Portal** (`/scan/:qrToken?t=:tenantId`): Dedicated view for phone camera scans showing sanitized public data.
- **Staff Portal & Dashboard** (`/dashboard`): Filterable asset directory, asset creation, QR code view/download/regeneration, assignment workflows, status transitions, and audit timeline.

---

## 2. Directory Structure

```text
b2b asset tracking/
├── backend/
│   ├── src/
│   │   ├── config/db.js                 # MongoDB connection
│   │   ├── models/                      # Tenant, User, Asset, AssetHistory, Employee, Location
│   │   ├── middlewares/                 # auth, roleGuard, validator, errorHandler
│   │   ├── schemas/                     # Zod validation schemas
│   │   ├── services/                    # assetService, qrService, historyService, authService, etc.
│   │   ├── routes/                      # public, auth, asset, employee, location routers
│   │   ├── scripts/seed.js              # Comprehensive demo seeder (10+ realistic assets)
│   │   ├── tests/                       # Unit & integration test suites
│   │   ├── app.js                       # Express app factory
│   │   └── server.js                    # Server startup
│   ├── .env.example
│   ├── .env                             # Environment config
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/apiClient.js             # Fetch wrapper with JWT & error formatting
│   │   ├── components/StatusBadge.jsx   # Status indicator badge
│   │   ├── pages/                       # ScanPage, LoginPage, DashboardPage
│   │   ├── index.css                    # Dark/glass theme styling & utility tokens
│   │   ├── App.jsx                      # Client router
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 3. Environment Setup & Configuration

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. The `.env` file is already created. Populate `MONGODB_URI` with your MongoDB Atlas connection string:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/b2b_asset_tracking?retryWrites=true&w=majority
   JWT_SECRET=vision71_super_secret_jwt_key_asset_tracking_2026
   FRONTEND_URL=http://localhost:5173
   NODE_ENV=development
   ```

3. Seed the database with realistic business demo data (1 Active Tenant, 2 Staff Users, 4 Locations, 5 Employees, and 12 Assets with complete history trails):
   ```bash
   npm run seed
   ```

4. Start the backend API server:
   ```bash
   npm run dev
   # or
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm run dev
   ```
2. Open your browser at `http://localhost:5173`.

---

## 4. Default Seed Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@vision71.com` | `AdminPass123!` | Full create, update, assign, status change, QR regeneration, and audit history access |
| **Viewer** | `viewer@vision71.com` | `ViewerPass123!` | Read-only access to assets, locations, employees, and history (no employee contact details or QR regeneration) |

---

## 5. API Reference Summary

### Global Conventions
- Base Path: `/api`
- Content Type: `application/json`
- Authentication Header: `Authorization: Bearer <JWT>`
- Standard Error Shape:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Resource does not exist within the caller's tenant",
      "fields": {}
    }
  }
  ```

### Key Endpoints

| Method | Endpoint | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/public/scan/:qrToken?t=<tenantId>` | None | Unauthenticated QR scan lookup. Returns sanitized public profile. |
| `POST` | `/api/auth/login` | None | Staff login returning 24h JWT. |
| `GET` | `/api/assets` | Admin, Viewer | Paginated, filterable asset directory (`?search=`, `?category=`, `?status=`, `?page=`, `?limit=`). |
| `GET` | `/api/assets/:id` | Admin, Viewer | Single asset details (`?includeQrImage=true` returns base64 PNG for Admins). |
| `POST` | `/api/assets` | Admin | Register new asset (auto-generates `AST000X` code & 64-char QR token). |
| `PATCH` | `/api/assets/:id` | Admin | Update asset metadata (`name`, `category`, `description`, `serialNumber`, `isPublicVisible`). |
| `POST` | `/api/assets/:id/assign` | Admin | Assign asset to employee or location (`employeeId` XOR `locationId`). |
| `POST` | `/api/assets/:id/unassign` | Admin | Idempotent unassignment back to inventory pool. |
| `POST` | `/api/assets/:id/status` | Admin | Change status (`Available`, `Assigned`, `In Repair`, `Retired`, `Lost`) with state transition validation. |
| `POST` | `/api/assets/:id/qr/regenerate` | Admin | Regenerate QR token, invalidating previous code and generating new 300x300 PNG image. |
| `GET` | `/api/assets/:id/history` | Admin, Viewer | Get immutable, append-only history log (newest first). |
| `GET` | `/api/employees` | Admin, Viewer | Paginated staff directory (`contactInfo` omitted). |
| `GET` | `/api/employees/:id` | Admin, Viewer | Single employee (`contactInfo` returned to Admins only). |
| `GET` | `/api/locations` | Admin, Viewer | Paginated facilities & locations list. |

---

## 6. Edge Cases Handled (EC 01 - EC 13)

- **EC 01 (Duplicate assetCode)**: Compound unique index `{ tenantId: 1, assetCode: 1 }` rejects duplicates with `409 Conflict`.
- **EC 02 & EC 03 (Unknown or Malformed QR Token)**: Returns generic `404 Not Found` without database leakage.
- **EC 04 (Asset Not Publicly Visible)**: `isPublicVisible: false` returns `404 Not Found` on public scan.
- **EC 05 (Already Assigned Asset)**: Assigning an already assigned asset returns `409 Conflict`.
- **EC 06 (Both Assignment Fields Submitted)**: Zod validator enforces mutual exclusivity, returning `422 Validation Error`.
- **EC 07 (Modification of Retired Asset)**: Mutating a `Retired` asset returns `409 Conflict`.
- **EC 08 (Viewer Write Attempt)**: Role guard middleware enforces `403 Forbidden`.
- **EC 09 (Unauthenticated Write Attempt)**: Returns `401 Unauthorized`.
- **EC 10 (Search Matches Nothing)**: Returns `200 OK` with `data: []` and `meta.total: 0`.
- **EC 11 (Invalid or Inactive Employee Assignment)**: Returns `404 Not Found` for nonexistent staff or `409 Conflict` if employee `status === 'inactive'`.
- **EC 12 (Inactive Tenant JWT)**: Auth middleware checks tenant status on every authenticated request, returning `401 Unauthorized` if tenant is deactivated.
- **EC 13 (Set Status to Available While Assigned)**: Transition to `Available` while assigned returns `409 Conflict`.

---

## 7. Running Automated Tests

Run the backend automated test suite:
```bash
cd backend
npm test
```
All schema validation, QR token generation, and routing tests run directly with high performance and zero external dependencies.
