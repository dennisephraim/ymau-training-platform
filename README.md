# YMAU Training Platform

A modern video-based training platform built for the Yale Model African Union (YMAU), designed to deliver structured online courses with enforced completion tracking, assessments, and certificate generation.

---

## What is This?

YMAU Training Platform is a **Learning Management System (LMS)** that allows instructors to create video courses and track student progress. Unlike traditional video platforms, this system **ensures students actually watch the content** by preventing fast-forwarding and tracking exactly which portions of each video have been viewed.

### The Problem It Solves

Traditional online courses face a common issue: students skip through videos to quickly "complete" them without actually learning. This platform addresses that by:

- **Blocking fast-forward** until content has been watched
- **Tracking watched segments** (not just "video opened")
- **Requiring 95% completion** before marking chapters as done
- **Component-based progress** combining videos and quizzes
- **Generating verified certificates** only after genuine completion

---

## Key Features

### For Students
- Browse and enroll in available courses
- Watch video chapters with progress tracking
- Resume exactly where you left off
- Take chapter quizzes with immediate feedback
- Submit tasks and assignments
- Access learning resources
- Earn certificates upon course completion
- View progress across all enrolled courses

### For Instructors
- Create courses with multiple video chapters
- Upload videos directly to cloud storage
- Create quizzes with configurable settings (passing scores, time limits, attempt limits)
- Create and grade student tasks/assignments
- Upload learning resources and materials
- Manage course iterations (semesters/cohorts)
- Generate enrollment codes for easy student access
- Approve/reject enrollment requests
- Track individual student progress
- View course analytics and engagement metrics
- Bulk download student attachments as ZIP files

### For Administrators
- View platform-wide statistics (users, courses, enrollments)
- Manage all users with search and filtering
- Promote/demote users between roles (student/instructor/admin)
- Activate/deactivate user accounts
- Full oversight of all platform activity

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16 + React 19 | React framework with App Router |
| **Language** | TypeScript | Type-safe development (strict mode) |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **UI Components** | Radix UI | Accessible component primitives |
| **Authentication** | Firebase Auth | Google OAuth sign-in |
| **Database** | Cloud Firestore | NoSQL document database (direct SDK) |
| **Storage** | Firebase Storage | Video and file storage |
| **Video Player** | Video.js | Custom player with seek controls |
| **PDF Generation** | @react-pdf/renderer | Certificate PDF creation |
| **QR Codes** | qrcode | Verification QR code generation |

---

## How It Works

### Course Structure
```
Course (e.g., "Delegate Training 2026")
├── Iteration (e.g., "Fall 2026", "Spring 2027")
│   ├── Enrolled Students
│   └── Enrollment Codes
├── Chapters (ordered videos + quizzes)
│   ├── Chapter 1: "Introduction" (15 min video + quiz)
│   ├── Chapter 2: "Procedures" (20 min video)
│   └── Chapter 3: "Best Practices" (25 min video + quiz)
├── Tasks (assignments with submissions)
└── Resources (learning materials)
```

### Progress Tracking

The platform uses **segment-based tracking** to ensure genuine video consumption:

1. **Watched Segments**: Records time ranges (e.g., 0:00-5:30, 7:00-12:00)
2. **Merge Algorithm**: Combines overlapping segments with 2-second tolerance
3. **Seek Prevention**: Can only skip to previously watched portions
4. **95% Threshold**: Chapters marked complete at 95% coverage

### Quiz System

Comprehensive assessment capabilities:
- **Question Types**: Multiple choice, true/false, multiple select
- **Configurable Settings**: Passing scores, attempt limits, time limits
- **Question Pools**: Random sampling and shuffling for variety
- **Detailed Feedback**: Explanations for correct/incorrect answers
- **Progress Integration**: Quiz completion counts toward chapter progress

### Task System

Assignment and submission management:
- **Response Types**: Text, file uploads, or both
- **Multi-Question Tasks**: Multiple prompts per assignment
- **Due Dates**: Optional deadlines for submissions
- **Instructor Grading**: Review and grade student work

### Enrollment Methods

Students can join courses through:
1. **Enrollment Codes** - Instructor generates shareable codes
2. **Request & Approval** - Student requests, instructor approves
3. **Direct Assignment** - Instructor adds student directly

### Certificates

Upon completing all chapters of a course:
1. **Auto-Generation**: System creates a professional PDF certificate
2. **QR Code Verification**: Each certificate includes a scannable QR code
3. **Public Verification**: Anyone can verify at `/verify/[code]`
4. **Unique Codes**: Format `YMAU-XXXX-XXXX` for easy sharing

---

## Architecture

### Service Layer Pattern

All database operations go through service modules in `/lib/services/`. The platform uses Firestore client SDK directly with no REST API backend layer.

Key services:
- `courses.ts` - Course and chapter CRUD
- `enrollments.ts` - Enrollment management
- `progress.ts` - Video segment tracking with merge algorithm
- `certificates.ts` - PDF generation and verification codes
- `quizzes.ts` - Quiz management and attempt tracking
- `tasks.ts` - Task creation and submission handling
- `users.ts` - User profile and role management

### Project Structure

```
ymau-training-platform/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   └── bulk-download/  # ZIP file generation
│   │   ├── dashboard/          # Student pages
│   │   │   ├── courses/        # Enrolled courses & viewer
│   │   │   ├── certificates/   # View & download certificates
│   │   │   ├── browse/         # Browse available courses
│   │   │   ├── tasks/          # Task submissions
│   │   │   ├── resources/      # Learning materials
│   │   │   └── enroll/         # Join via code
│   │   ├── instructor/         # Instructor pages
│   │   │   ├── courses/        # Course management
│   │   │   ├── tasks/          # Task creation & grading
│   │   │   └── analytics/      # Course analytics
│   │   ├── admin/              # Admin pages
│   │   ├── verify/[code]/      # Public certificate verification
│   │   └── login/              # Authentication
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── video/              # Video player components
│   │   ├── quiz/               # Quiz player components
│   │   ├── certificates/       # Certificate PDF & generation
│   │   ├── auth/               # Authentication context
│   │   ├── courses/            # Course-related components
│   │   └── layout/             # Layout components
│   ├── lib/
│   │   ├── firebase/           # Firebase configuration
│   │   ├── services/           # Business logic (Firestore operations)
│   │   ├── hooks/              # Custom React hooks
│   │   └── utils/              # Utility functions (cn(), formatters)
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase project with Firestore, Auth, and Storage enabled

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ymau-training-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Firebase credentials

# Run development server
npm run dev
```

### Development Commands

```bash
npm run dev       # Start Next.js dev server on port 3000
npm run build     # Production build
npm run lint      # Run ESLint
npm start         # Start production server
```

### Environment Variables

```bash
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## User Roles

| Role | Access Level |
|------|--------------|
| **Student** | Enroll in courses, watch videos, take quizzes, submit tasks, earn certificates |
| **Instructor** | All student abilities + create/manage courses, quizzes, tasks, and resources |
| **Admin** | All instructor abilities + manage users/roles |

New users automatically receive the "student" role. Admins can promote users to instructors through the user management interface.

---

## Security Features

- **Google OAuth** for secure authentication
- **Role-based access control** on all routes
- **Firestore security rules** for data protection
- **Storage security rules** for file access control
- **Server-side validation** of progress updates

---

## Development Status

This project is under active development. See [CHANGELOG.md](./CHANGELOG.md) for detailed progress.

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Foundation | Complete | Auth, UI components, navigation |
| Phase 2: Course Management | Complete | CRUD operations, video upload |
| Phase 3: Enrollment System | Complete | Codes, requests, direct enrollment |
| Phase 4: Video Player | Complete | Custom player, progress tracking |
| Phase 5: Certificates | Complete | Auto-generation, QR codes, verification |
| Phase 6: Analytics & Admin | Complete | Dashboards, user management, role control |
| Phase 7: Quizzes & Tasks | Complete | Assessments, assignments, grading |

### Recent Enhancements (Feb 2026)
- Bulk download attachments feature
- Improved mobile view
- Enhanced video progress tracking

---

## Contributing

This is a private project for Yale Model African Union. For inquiries, please contact the project maintainers.

---

## License

Private - All rights reserved.
