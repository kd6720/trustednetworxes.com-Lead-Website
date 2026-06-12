# TrustedNetworx CRM — Lead Management System

## Stack
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS v4 + React Router v6
- Backend: Express.js + Prisma ORM + SQLite (swap to PostgreSQL later)
- Auth: JWT (jsonwebtoken + bcryptjs)
- Icons: lucide-react
- SEO: react-helmet-async

## Architecture
```
/ — React SPA (Vite dev server on :5173, proxies /api to :3001)
/server — Express API server (port 3001)
  /server/index.ts — Express app entry
  /server/routes/ — auth, companies, contacts, leads, forms, webhooks, admin
  /server/middleware/ — auth middleware, validation
/prisma/schema.prisma — Database schema
```

## Database Tables
- User (id, email, password, name, role, createdAt)
- Company (id, name, website, industry, size, address, city, state, zip, notes, leadSource, assignedUserId, createdAt)
- Contact (id, firstName, lastName, title, email, phone, mobile, companyId, notes, leadStatus, assignedUserId, createdAt)
- Lead (id, name, companyId, contactId, source, status, estimatedValue, nextFollowUp, notes, assignedUserId, createdAt)
- Activity (id, type, description, leadId, userId, createdAt)
- Form (id, name, fields, redirectUrl, confirmationMessage, notifyEmail, spamProtection, createdAt)
- FormSubmission (id, formId, data, source, ip, userAgent, createdAt)
- ApiKey (id, key, name, userId, scopes, lastUsed, createdAt)

## Lead Statuses
New, Contacted, Qualified, Proposal Sent, Won, Lost

## User Roles
admin, manager, user

## Key Features Required
1. Dashboard with stats + pipeline view
2. Companies CRUD with search/filter
3. Contacts CRUD linked to companies
4. Leads/Opportunities with pipeline stages
5. Activity timeline per lead
6. Lead capture form builder + embeddable code
7. REST API with API key auth
8. Webhook support for new leads
9. User auth (login/register) with JWT
10. Mobile responsive — sidebar navigation

## Design Direction
- Clean SaaS aesthetic — Pipedrive/HubSpot inspired but lighter
- Blue/gray palette, white cards, subtle shadows
- Left sidebar navigation
- Pipeline cards with drag states (future)
- Clean data tables
- "Add New" quick-action button

## Key Commands
- Backend: npm run server (tsx watch server/index.ts)
- Frontend: npm run dev
- DB: npx prisma studio, npx prisma migrate dev
- Build: npm run build
