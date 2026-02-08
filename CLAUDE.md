# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YMAU Training Platform is a Learning Management System (LMS) for Yale Model African Union. Its core innovation is **enforced video consumption tracking** - students cannot skip ahead in videos, and progress is tracked via watched time segments with a merge algorithm. Chapters require 95% actual watch time to complete.

## Development Commands

```bash
npm run dev       # Start Next.js dev server on port 3000
npm run build     # Production build
npm run lint      # Run ESLint
npm start         # Start production server
```

## Tech Stack

- **Framework**: Next.js 16 with App Router (no pages directory)
- **Language**: TypeScript (strict mode)
- **Database**: Cloud Firestore (direct client SDK access, no REST API backend)
- **Auth**: Firebase Auth with Google OAuth
- **Storage**: Firebase Storage for videos, images, PDFs
- **Styling**: Tailwind CSS 4 with PostCSS
- **UI Components**: Radix UI (dialogs, dropdowns, toasts, avatars)
- **Video Player**: Video.js with custom seek restriction logic
- **PDF Generation**: @react-pdf/renderer for certificates

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Student routes
│   ├── instructor/         # Instructor routes
│   ├── admin/              # Admin routes
│   ├── verify/[code]/      # Public certificate verification
│   └── login/              # Auth page
├── components/
│   ├── ui/                 # Reusable UI components (Button, Card, Modal, etc.)
│   ├── auth/               # AuthContext (global auth state via React Context)
│   ├── video/              # VideoPlayer with progress tracking
│   └── certificates/       # CertificatePDF, CertificateGenerator
├── lib/
│   ├── firebase/           # Firebase config and initialization
│   ├── services/           # Business logic (Firestore operations)
│   ├── hooks/              # Custom React hooks
│   └── utils/              # cn(), formatters
└── types/                  # TypeScript interfaces for all data models
```

### Service Layer Pattern

All database operations go through service modules in `/lib/services/`:
- `courses.ts` - Course and chapter CRUD
- `enrollments.ts` - Enrollment management
- `progress.ts` - Video segment tracking with merge algorithm
- `certificates.ts` - PDF generation and verification codes
- `quizzes.ts` - Quiz management and attempt tracking
- `users.ts` - User profile and role management

Services use Firestore client SDK directly. No REST API layer exists.

### Role-Based Access

Three user roles with hierarchical permissions:
- **student**: Enroll, watch videos, submit tasks, earn certificates
- **instructor**: All student abilities + create/manage courses
- **admin**: All instructor abilities + manage users and roles

New users default to `student` role. Authorization enforced via:
1. Firestore Security Rules (`firestore.rules`)
2. Storage Rules (`storage.rules`)
3. Client-side checks in components

### Video Progress Tracking

Core algorithm in `lib/services/progress.ts`:
- Tracks `WatchedSegment[]` (start/end time pairs)
- `mergeSegments()` combines overlapping segments (2-second tolerance)
- `maxWatchedPosition` prevents seeking beyond watched content
- Chapter completes at 95% total coverage

### Key Firestore Collections

- `users/{uid}` - User profiles with role field
- `courses/{id}` - Course metadata
- `courses/{id}/chapters/{id}` - Chapter subcollection
- `enrollments/{id}` - Student course enrollments
- `progress/{enrollmentId}_{chapterId}` - Video watch progress
- `certificates/{id}` - Issued certificates (public read for verification)
- `quizzes/{id}` - Chapter quizzes
- `quizAttempts/{id}` - Student quiz attempts

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_APP_URL
```

## Deployment

Firebase App Hosting with Cloud Run (Node.js 20). Configuration in `apphosting.yaml` and `firebase.json`.

## Path Alias

Use `@/*` which maps to `./src/*` (configured in tsconfig.json).
