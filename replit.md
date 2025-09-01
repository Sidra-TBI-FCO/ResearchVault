# Research Portal System - Architecture Summary

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

## Changelog
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