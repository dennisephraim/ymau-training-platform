# Changelog

All notable changes to the YMAU Training Platform are documented in this file.

This changelog is organized by development phases, with each phase representing a major feature milestone. Each entry includes the files created/modified and a summary of what was implemented.

---

## [Phase 4] - Video Player & Progress Tracking

**Status:** Complete

### Summary
Implemented a custom video player with anti-skip functionality and comprehensive progress tracking that persists both locally and to the server.

### Features Added
- Custom Video.js player with seek prevention
- Segment-based progress tracking (records exactly what was watched)
- 95% completion threshold for chapter completion
- Local storage backup with server sync
- Course viewing page with chapter navigation
- Visual progress indicators showing watched segments
- Chapter locking (must complete previous chapters)

### Files Created
```
src/components/video/
├── VideoPlayer.tsx          # Custom Video.js player with seek prevention
└── index.ts                 # Component exports

src/lib/hooks/
└── useVideoProgress.ts      # Hook for progress management with sync

src/types/
└── progress.ts              # Progress-related TypeScript types

src/lib/services/
└── progress.ts              # Progress CRUD and calculation utilities

src/app/dashboard/courses/
└── [enrollmentId]/
    └── page.tsx             # Course viewer with video player
```

### Files Modified
```
src/lib/services/enrollments.ts    # Added getEnrollment() function
src/app/dashboard/courses/page.tsx # Added real progress display
src/types/index.ts                 # Added progress type exports
```

### Technical Details
- **Segment Merging**: Adjacent segments within 2 seconds are merged
- **Progress Calculation**: Weighted by chapter duration for course-level progress
- **Auto-save**: Progress syncs to server every 30 seconds
- **Resilience**: Local storage backup ensures no progress loss

---

## [Phase 3] - Enrollment System

**Status:** Complete

### Summary
Built a flexible enrollment system supporting multiple methods: enrollment codes, request/approval workflow, and direct instructor assignment.

### Features Added
- Browse published courses
- Enrollment code generation and redemption
- Request/approval workflow for enrollment
- Direct student assignment by instructors
- Student management page for instructors

### Files Created
```
src/app/dashboard/
├── browse/page.tsx          # Browse available courses
└── enroll/page.tsx          # Join course via code

src/app/instructor/courses/[courseId]/iterations/[iterationId]/
└── students/page.tsx        # Manage enrolled students

src/lib/services/
├── browse.ts                # Browse courses service
└── enrollments.ts           # Enrollment operations
```

### Files Modified
```
src/types/enrollment.ts      # Added EnrollmentRequest types
src/lib/services/iterations.ts # Added enrollment code functions
```

---

## [Phase 2] - Course Management

**Status:** Complete

### Summary
Implemented full course and chapter management with video upload capabilities and course iteration (semester) support.

### Features Added
- Course CRUD operations (create, read, update, delete)
- Chapter management with drag-and-drop reordering
- Video upload to Firebase Storage with progress indicator
- Course iterations (semesters/cohorts)
- Enrollment code generation

### Files Created
```
src/app/instructor/
├── courses/
│   ├── page.tsx                    # Course listing
│   ├── new/page.tsx                # Create course
│   └── [courseId]/
│       ├── page.tsx                # Edit course
│       ├── chapters/page.tsx       # Manage chapters
│       └── iterations/page.tsx     # Manage iterations

src/components/courses/
├── CourseForm.tsx           # Course create/edit form
└── VideoUpload.tsx          # Video upload component

src/lib/services/
├── courses.ts               # Course CRUD operations
├── iterations.ts            # Iteration management
└── storage.ts               # Firebase Storage upload
```

### Files Modified
```
src/types/course.ts          # Added Chapter type
src/types/enrollment.ts      # Added Iteration, EnrollmentCode types
```

---

## [Phase 1] - Foundation

**Status:** Complete

### Summary
Set up the project foundation including Firebase integration, authentication, base UI components, and navigation structure.

### Features Added
- Next.js 16 project with TypeScript and Tailwind CSS
- Firebase configuration (Auth, Firestore, Storage)
- Google OAuth sign-in flow
- Auto-create user document on first sign-in
- Base UI components (Button, Card, Input, Avatar)
- Role-based sidebar navigation
- Route protection middleware
- User role system (student, instructor, admin)

### Files Created
```
src/lib/firebase/
└── config.ts                # Firebase client configuration

src/components/
├── ui/
│   ├── Button.tsx           # Button component
│   ├── Card.tsx             # Card component
│   ├── Input.tsx            # Input component
│   ├── Avatar.tsx           # Avatar component
│   └── index.ts             # UI exports
├── auth/
│   ├── AuthContext.tsx      # Authentication context
│   └── index.ts             # Auth exports
└── layout/
    ├── Sidebar.tsx          # Role-based navigation
    ├── Header.tsx           # App header
    └── index.ts             # Layout exports

src/app/
├── login/page.tsx           # Login page
├── dashboard/
│   ├── layout.tsx           # Dashboard layout
│   ├── page.tsx             # Dashboard home
│   ├── progress/page.tsx    # Progress overview
│   ├── certificates/page.tsx # Certificates list
│   └── settings/page.tsx    # User settings
├── instructor/
│   └── analytics/page.tsx   # Instructor analytics
├── admin/
│   └── users/page.tsx       # User management
└── middleware.ts            # Route protection

src/types/
├── user.ts                  # User types
├── course.ts                # Course types
├── enrollment.ts            # Enrollment types
└── index.ts                 # Type exports

src/lib/utils/
├── cn.ts                    # Class name utility
└── formatters.ts            # Date/time formatters
```

### Technical Notes
- Firebase config handles missing env vars during build (SSR-safe)
- User documents created with default "student" role
- First admin must be set manually in Firebase Console

---

## Upcoming Phases

### [Phase 5] - Certificates (Pending)
- Auto-generated PDF certificates with QR codes
- Custom template upload by instructors
- Public verification page at `/verify/[code]`
- Certificate storage in Firebase Storage

### [Phase 6] - Analytics & Polish (Pending)
- Instructor dashboard with class progress
- Admin user management interface
- Role promotion/demotion
- Final testing and bug fixes

---

## Quick Reference

### Key Files by Feature

| Feature | Primary Files |
|---------|---------------|
| Authentication | `lib/firebase/config.ts`, `components/auth/AuthContext.tsx` |
| Course Management | `lib/services/courses.ts`, `app/instructor/courses/` |
| Video Player | `components/video/VideoPlayer.tsx`, `lib/hooks/useVideoProgress.ts` |
| Progress Tracking | `lib/services/progress.ts`, `types/progress.ts` |
| Enrollments | `lib/services/enrollments.ts`, `app/dashboard/enroll/` |

### Database Collections

| Collection | Purpose |
|------------|---------|
| `users` | User profiles and roles |
| `courses` | Course definitions |
| `courses/{id}/chapters` | Video chapters |
| `courseIterations` | Semester instances |
| `enrollments` | Student enrollments |
| `enrollmentCodes` | Join codes |
| `enrollmentRequests` | Pending requests |
| `progress` | Video watch progress |
| `certificates` | Generated certificates |

---

*Last updated: Phase 4 completion*
