# Research Portal System - Architecture Summary

## Product

### One-liner
Q-BRIDGE is a shared research governance portal that lets Qatar's biomedical institutions run IRB, IBC, grant, and publication workflows in one place.

### What it does
Q-BRIDGE replaces the scattered spreadsheets, email threads, and PDF forms that research offices use to track compliance and project activity. Investigators submit IRB and IBC applications through structured multi-tab forms, office reviewers move them through a status workflow with timestamped comments, and the same records connect to the underlying scientists, programs, projects, grants, contracts, patents, and publications. Staff can see a unified history of every submission, revision, and approval against the project it belongs to.

### Who it's for
- Principal investigators and research scientists
- IRB and IBC office staff and reviewers
- Research program and project managers (PMO)
- Grants and contracts administrators
- Publications office staff tracking journal metrics

### Key features
- IRB and IBC application workflow with reviewer comments
- Multi-institution support (Sidra, HBKU, WCM-Q) with theming
- Scientists, programs, projects, and research activities registry
- Grants, contracts, patents, and publications tracking
- Journal impact factor lookup across 28,000+ journals
- Facilities, rooms, and biosafety PPE management
- Document uploads attached to applications and contracts

### Tech stack
- React 18 + TypeScript + Vite frontend
- shadcn/ui on Radix primitives, Tailwind CSS, Framer Motion
- TanStack Query, Wouter routing, React Hook Form + Zod
- Express.js backend on Node.js with TypeScript
- PostgreSQL (Neon serverless) via Drizzle ORM
- Session auth (express-session + connect-pg-simple, Passport local)
- Google Cloud Storage with Uppy for document uploads

### Audience tags
Sidra scientists, Academic partners, Clinicians

### Status
Internal pilot

## Overview

The Research Portal System is a full-stack web application built for managing scientific research activities, including scientists, programs, projects, publications, patents, and regulatory applications (IRB/IBC). The application follows a modern monorepo structure with a React frontend and Express.js backend, utilizing PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware-based architecture
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage
- **Authentication**: Custom session-based authentication with password hashing

### Database Architecture
- **Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Connection**: Neon serverless with WebSocket support for real-time capabilities

## Key Components

### Domain Entities
1. **Scientists & Staff**: Personnel management with roles, departments, and hierarchical relationships
2. **Programs (PRM)**: High-level research program organization
3. **Projects (PRJ)**: Specific research initiatives linked to programs
4. **Research Activities (SDR)**: Detailed scientific data records
5. **Publications**: Academic publications with authorship tracking
6. **Patents**: Intellectual property management
7. **IRB Applications**: Institutional Review Board compliance
8. **IBC Applications**: Institutional Biosafety Committee oversight
9. **Data Management Plans**: Research data governance
10. **Research Contracts**: Collaboration and funding agreements

### Frontend Features
- **Dashboard**: Real-time statistics and recent activity feed
- **Entity Management**: CRUD operations for all domain entities
- **File Management**: Document upload and attachment system
- **Search & Filtering**: Global search across entities
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Form Validation**: Comprehensive client-side validation with error handling
- **Timeline Management**: Chronological workflow progression with priority-based sorting for status changes and comments
- **Bidirectional Commenting**: Office and Principal Investigator comment exchange with comprehensive timeline tracking

### Backend Services
- **RESTful API**: Consistent REST endpoints for all entities
- **Authentication Middleware**: Session validation and role-based access control
- **Database Abstraction**: Storage interface pattern for testability
- **Error Handling**: Centralized error processing with structured responses
- **Health Monitoring**: Database connectivity and system status endpoints

## Data Flow

### Request Flow
1. Client makes authenticated request to API endpoint
2. Authentication middleware validates session
3. Route handler processes request with business logic
4. Database storage layer executes queries via Drizzle ORM
5. Response data is serialized and returned to client
6. React Query caches response and updates UI components

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Server validates against hashed passwords in database
3. Session is created and stored in PostgreSQL
4. Session cookie is set for subsequent requests
5. Protected routes check session validity via middleware

### Database Operations
1. Schema defined in shared TypeScript files
2. Drizzle generates type-safe query builders
3. Migrations managed through Drizzle Kit
4. Connection pooling via Neon serverless client

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management
- **wouter**: Client-side routing
- **tailwindcss**: Utility-first CSS framework

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **lucide-react**: Icon library
- **react-hook-form**: Form state management
- **zod**: Schema validation
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for Node.js
- **drizzle-kit**: Database schema management

## Deployment Strategy

### Development Environment
- Vite development server for frontend with hot module replacement
- tsx for running TypeScript backend with file watching
- Development database provisioned via Neon
- Real-time error overlay for debugging

### Production Build
- Frontend built to static assets via Vite
- Backend compiled to ESM modules via esbuild
- Single Node.js process serves both API and static files
- Production database with connection pooling

### Database Management
- Schema migrations via `drizzle-kit push`
- Seed data scripts for initial setup
- Environment-based configuration
- Backup and recovery procedures (external to application)

## Authentication (multi-provider, SSO off by default)

The app has one unified auth system with four modes, selected by the
`AUTH_MODE` environment variable:

| `AUTH_MODE` | What it does |
|---|---|
| `local` (default) | Real local username/password login backed by the `users` table, with first-time registration and optional super-admin promotion (`SUPER_ADMIN_EMAIL`). No session is auto-injected — users must sign in. For open, no-login testing on Replit we run `demo` mode instead (see below). |
| `demo` | Auto-injects a shared guest user on every request, no login wall. |
| `ldap` | Username/password validated against an LDAP / Active Directory server (uses `ldapts`). |
| `oidc` | OpenID Connect single sign-on (PKCE + end-session logout). Microsoft Entra ID is just a configured OIDC issuer. |

**SSO (ldap/oidc) is OFF by default.** With `AUTH_MODE` unset or set to
`local`/`demo`, behaviour is exactly as before: the sidebar role selector and
local login form remain active and there are no SSO redirects.

### Schema migration (required before enabling SSO)

The provisioning flow depends on two columns on `users`:
`auth_provider` (default `'local'`, NOT NULL) and `entra_oid` (nullable, unique —
reused as the generic external subject id). Apply either:

- `npm run db:push` against the target database, or
- `migrations/20260525_add_entra_auth_columns.sql` directly.

The migration is idempotent (`IF NOT EXISTS`) and safe on existing rows.

### Enabling OIDC (including Microsoft Entra ID)

Set `AUTH_MODE=oidc` and these variables in the deployment:

| Variable | Required | Description |
|---|---|---|
| `OIDC_ISSUER_URL` | yes | Issuer URL. For Entra: `https://login.microsoftonline.com/<tenant>/v2.0` |
| `OIDC_CLIENT_ID` | yes | Application (client) ID |
| `OIDC_CLIENT_SECRET` | yes | Client secret value |
| `OIDC_REDIRECT_URI` | yes | Must match a registered redirect, e.g. `https://qbridge.sidra.org/api/auth/callback` |
| `OIDC_PROVIDER_NAME` | no | Sign-in button label, e.g. `Microsoft` (default `SSO`) |
| `OIDC_SCOPE` | no | Defaults to `openid profile email` |
| `OIDC_CLAIM_SUBJECT` / `OIDC_CLAIM_USERNAME` / `OIDC_CLAIM_NAME` / `OIDC_CLAIM_EMAIL` | no | Claim mappings (defaults `sub` / `preferred_username` / `name` / `email`) |
| `OIDC_POST_LOGOUT_REDIRECT_URI` | no | Where the provider sends the user after sign-out (defaults to `<host>/login`) |
| `AUTH_DEFAULT_ROLE` | no | Role for new SSO users on first sign-in (default `Investigator`) |
| `APP_URL` | no | Public app origin, used to build the default redirect URI |

### Enabling LDAP

Set `AUTH_MODE=ldap` and: `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`,
`LDAP_SEARCH_BASE`, `LDAP_SEARCH_FILTER` (use the `{{username}}` placeholder,
e.g. `(sAMAccountName={{username}})`). Optional field mappings:
`LDAP_USER_FIELD_USERNAME` / `_NAME` / `_EMAIL`, and TLS controls
`LDAP_TLS` / `LDAP_TLS_REJECT_UNAUTHORIZED`.

### Behaviour when SSO is on

- The local username/password form and the sidebar role selector are hidden.
- OIDC shows a single "Sign in with `<provider name>`" button.
- New users are auto-provisioned (OIDC matched on subject id → email → username;
  LDAP matched on email → username) and assigned `AUTH_DEFAULT_ROLE`.
- OIDC sign-out clears the local session and redirects through the provider's
  end-session endpoint.

The server logs the active mode on startup, e.g.
`[auth] SSO ENABLED — mode=oidc` or `[auth] SSO DISABLED — mode=local`.

### Disabling

Set `AUTH_MODE=local` (or leave it unset) and restart. Behaviour returns to the
role-emulation flow with no SSO redirects.

## Changelog
- June 9, 2026. Reconciled the codebase after syncing the colleague's on-prem fork (first-time registration, super-admin, PostgreSQL session store, Docker neon/pg DB branching). Fixes: removed dead/non-existent OIDC imports in `server/auth.ts`; replaced a CommonJS `require()` in `/api/auth/config` with `await import()` (this is an ESM `"type":"module"` project — `require` is not defined at runtime); added `"target":"ES2022"` to `tsconfig.json` so `npm run check` passes with the new top-level `await` in `server/db.ts`; standardized `/api/auth/config` to return `{ mode, ssoEnabled, provider, providerName }` and unified the client (`login.tsx`) onto `providerName`. Deployment split: Replit (dev workspace + published link) runs `AUTH_MODE=demo` via env vars (open, no login, "Demo User"/Management) since the merge removed the old dev auto-injection; the colleague's on-prem stays on `AUTH_MODE=ldap` via its own env. No app code controls which environment is open — it's purely env config.
- June 7, 2026. Unified authentication into one multi-provider system selected by `AUTH_MODE` (local default / demo / ldap / oidc), SSO off by default. Replaced the Entra-specific module with a generic OIDC provider (PKCE + end-session logout; Entra is just a configured issuer) and added an LDAP provider (`ldapts`). Updated `/api/auth/config` to expose mode + provider name, refreshed the client useAuth/login/Sidebar and the Settings auth panel (SSO toggle off by default).
- May 31, 2026. Made the IBC application edit page's right sidebar (Communication History, Submission Comment, Save/Submit) collapsible on desktop to give the main form more editing width
- January 20, 2026. Redesigned IBC application edit page with two-column layout: main form on left, sticky right sidebar with Communication History, Submission Comment, and Save/Submit buttons for better usability
- January 20, 2026. Removed redundant Risk Group Classification field from IBC applications as Biosafety Level already provides this information
- January 15, 2026. Added Team Management functionality to Settings with three tabs (Layout & Theme, Team Members, Feature Requests). Team members can be categorized as Element Leads, Faculty Testers, or Developers with full CRUD operations and photo support.
- January 6, 2026. Added configurable abbreviations (PRM/PRJ/SDR etc.) per institution with sidebar integration
- January 6, 2026. Added WCM-Q (Weill Cornell Medicine-Qatar) as third institution with Cornell red color theme
- January 6, 2026. Added configurable project management labels (Tier 1/2/3) per institution in Settings with localStorage persistence
- January 6, 2026. Renamed QBRI to HBKU (Hamad Bin Khalifa University) in theme system
- December 29, 2025. Added external profile links to Staff information page: ORCID, LinkedIn, Google Scholar, and Web of Science Author Profile with clickable buttons and branded icons
- September 1, 2025. Added pagination (100 records per page) and column sorting to Publication Office for faster loading of 3,000+ journal records
- September 1, 2025. Enhanced publication detail pages to show three-year impact factor comparison: year before publication, publication year (bold/larger), and most current year
- September 1, 2025. Implemented clickable column headers with sort indicators for all JCR fields with default rank ascending sort
- September 1, 2025. Enhanced journal impact factor system to include comprehensive JCR fields: ISSN, eISSN, Total Articles, Citable Items, Cited/Citing Half-Life metrics, 5-Year JIF, JIF Without Self-Cites, and JCI with full database schema and import functionality
- September 1, 2025. Updated Publication Office interface to display all JCR fields in tabular format with 28,480+ journal records
- September 1, 2025. Added impact factor display to publication detail pages showing current year and previous year metrics with quartile color-coding
- September 1, 2025. Added journal impact metrics summary to scientist overview pages
- August 24, 2025. Added comprehensive NIH Guidelines tab to IBC applications with 5 sections (III-A/B/C, III-D, III-E, III-F, Appendix C) following NIH recombinant DNA research requirements
- August 24, 2025. Added Protocol Summary field to IBC application Overview tab with enhanced guidance text for both Project Description and Protocol Summary fields
- August 24, 2025. Removed redundant Submission Comments field from Overview tab to eliminate duplication
- August 24, 2025. Implemented unified read-only view functionality for IBC applications using single edit page with conditional form disabling based on application status
- August 24, 2025. Added View/Edit button logic to IBC application list - Edit button for drafts only, View button for all applications
- August 24, 2025. Fixed data integrity bug where principalInvestigatorId was reset to 0 during form submissions due to || operator instead of ?? nullish coalescing
- August 24, 2025. Standardized timeline displays across all application views using unified TimelineComments component with proper comment content display and removal of redundant status change entries
- August 24, 2025. Implemented separate IBC comments table for reliable communication tracking with proper timestamps and author information
- August 24, 2025. Fixed reviewer feedback workflow to return applications to "vetted" status for revision requests
- August 24, 2025. Added comment validation requiring office users to provide comments before executing workflow actions  
- August 24, 2025. Updated scientist management: removed role field and isStaff toggle, added "Management" job title, replaced with line manager field
- August 24, 2025. Enhanced program forms: replaced text fields with scientist dropdown selections for director and co-lead positions
- August 24, 2025. Created scientist edit form with full CRUD functionality including line manager selection
- July 17, 2025. Implemented comprehensive IBC timeline ordering system with content-based chronological workflow progression
- July 17, 2025. Fixed React rendering errors and converted office comments from single text to JSON array format
- July 17, 2025. Added draft status and priority-based timeline sorting ensuring proper workflow sequence
- June 29, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.