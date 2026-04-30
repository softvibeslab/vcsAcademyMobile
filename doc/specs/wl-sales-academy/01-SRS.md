# Software Requirements Specification

Product: WL | White Label Sales Academy  
Version: 1.0  
Date: 2026-04-29

## 1. Introduction

WL | White Label Sales Academy is an AI-powered sales training, roleplay, compliance, and performance platform for resort and vacation club sales teams. The application trains sales representatives to master the official Blueprint of the Sale, practice with Smart Agent, log daily performance, receive manager feedback, and progress toward certification.

The product is intended to be mobile-first with an iOS-style premium black-and-gold interface. It may include web/admin surfaces, but the primary rep experience is app-like and optimized for repeated daily use.

## 2. Scope

The system shall support:

- Sales representative onboarding and training.
- Step-by-step Blueprint training.
- Smart Agent coaching and Q&A.
- AI-supported roleplay practice.
- Smart GoalSheet daily sales entry.
- Manager/trainer review and feedback.
- Certification readiness tracking.
- Admin content and user management.
- Access control for sensitive sales, pricing, incentive, and program materials.
- Analytics for progress, performance, and training quality.

The system shall not:

- Replace legal/contract documents.
- Present sample pricing or incentives as real approved offers.
- Encourage misleading, manipulative, or disrespectful client language.
- Depend only on client-side role checks for sensitive content.

## 3. Product Context

The platform is built around the official Blueprint of the Sale. The intended learning flow is not flexible course browsing first; it is a structured mastery path. Training content, roleplays, checklists, quizzes, and manager evaluations should map back to the Blueprint.

## 4. User Classes

### Visitor

Can view public introduction or login/onboarding content if enabled.

### Sales Representative

Can access assigned modules, scripts, roleplays, quizzes, resources, Smart Agent, GoalSheet, feedback, and certifications.

### Sales Trainer / Coach

Can create or update lessons, assign modules, review submissions, score rubrics, provide feedback, and recommend certification readiness.

### Manager / T.O. Manager

Can view team progress, Point of Confirmation readiness, T.O. readiness, roleplay scores, coaching notes, and certification approvals.

### Admin

Can manage users, roles, content, permissions, sensitive material access, settings, and analytics.

## 5. Operating Environment

Current repository contains multiple surfaces. The target implementation should follow the actual project architecture when coding:

- Mobile app: Expo / React Native under `apps/mobile`.
- Web frontend: React under `frontend`.
- Backend: FastAPI / Python under `backend`.
- Data: existing backend persistence patterns, currently MongoDB in historical docs.
- Existing docs and wiki: `docs`, `wiki`, `obsidian-super-wiki`.

If implementation changes toward Next.js/PostgreSQL/Prisma in the future, this SPEC remains product source of truth while technical implementation docs must be updated.

## 6. Functional Requirements

### FR-001 Authentication

The system shall allow authorized users to authenticate using the existing auth provider.

Acceptance:

- Authenticated users can access role-appropriate screens.
- Unauthenticated users are directed to onboarding/login.
- Session restoration works on mobile app launch.

### FR-002 Role-Based Authorization

The system shall enforce roles on the server for protected content and actions.

Acceptance:

- Reps cannot access admin-only or manager-only data.
- Sensitive materials are hidden unless the user has explicit access.
- Unauthorized API access returns a safe error.

### FR-003 Blueprint Training Path

The system shall display and enforce the 11-step Blueprint sequence.

Official sequence for the product:

1. Meet & Greet
2. Agenda
3. Breakfast / F.O.R.M.
4. Discovery / Survey
5. Break & Remake the Pact
6. Property Tour
7. Model Suite
8. Screen Tour & Flower
9. Point of Confirmation
10. Programs
11. T.O. Pricing

Acceptance:

- Steps appear in order.
- Completed, current, and locked states are visually distinct.
- 3-Way Pitch, Home Away from Home Program, First Visit Incentives, and Fee Disclosure appear as sub-lessons, not top-level steps, unless explicitly approved.

### FR-004 Blueprint Step Detail

The system shall provide a detail page for each step with purpose, training media, script/talk track, audio, context, checklist, and practice CTA.

Acceptance:

- Step 5 detail includes professional commitment-setting guidance.
- Script content is labeled as training/practice unless it is official approved material.
- Context note explains where the step belongs in the Blueprint.

### FR-005 Smart Agent Chat

The system shall allow reps to ask the Smart Agent questions about training, objections, roleplay, resources, and performance.

Acceptance:

- Smart Agent responses are professional, compliant, and grounded in approved knowledge.
- Smart Agent may cite relevant modules or resources when available.
- Sensitive content is not returned to unauthorized users.

### FR-006 Roleplay Live

The system shall provide a roleplay practice experience that simulates a live coaching session.

Acceptance:

- Scenario, Blueprint step, role, timer, status, coach/rep tiles, controls, and tip card are visible.
- The active roleplay can be associated with a specific Blueprint step.
- Session output can be scored or summarized when roleplay analysis is enabled.

### FR-007 Smart GoalSheet

The system shall allow reps to log daily tour and sales performance.

Acceptance:

- Rep can select tour outcome, sales outcome, volume, number of sales, manager/T.O. optional field, no-sale reason, follow-up reminders, and notes.
- Metrics such as closing %, VPG, volume, goal progress, and comparison vs previous day are calculated or displayed.
- Smart Agent insight is generated from the entry.

### FR-008 Progress Tracking

The system shall track module completion, quiz attempts, roleplay submissions, checklist completion, feedback, and certification progress.

Acceptance:

- Dashboard reflects progress accurately.
- Certification status updates only when required criteria are met.

### FR-009 Manager/Trainer Review

The system shall allow managers/trainers to review roleplays, score rubrics, provide feedback, and approve readiness.

Acceptance:

- Reviewers can only review users within authorized scope.
- Feedback history is preserved.
- Approval actions are auditable.

### FR-010 Admin Content Management

The system shall allow admins to manage courses, modules, lessons, scripts, quizzes, rubrics, resources, and certifications.

Acceptance:

- Content can be created, updated, archived, and permissioned.
- Sensitive content requires access metadata.

### FR-011 Resource Library

The system shall provide searchable resources including scripts, checklists, videos, audio, worksheets, and policy/compliance notes.

Acceptance:

- Resources can be filtered by Blueprint step, role, type, and sensitivity.
- Unauthorized sensitive resources are hidden or blocked.

### FR-012 Notifications and Reminders

The system should support reminders for follow-ups, roleplay reviews, assigned modules, and certification tasks.

Acceptance:

- Follow-up reminders entered in GoalSheet are persisted.
- Users can view upcoming reminders.

## 7. Non-Functional Requirements

### NFR-001 Usability

The mobile app shall be optimized for one-handed iPhone use and repeated daily workflows.

### NFR-002 Accessibility

The system shall use readable text, semantic labels where applicable, clear contrast, keyboard support on web, and accessible names for controls.

### NFR-003 Performance

The app shall avoid unnecessary loading of large videos/resources. Dashboards must remain responsive with many users and submissions.

### NFR-004 Security

Sensitive content and performance data must be protected through server-side authorization and access logs where architecture supports it.

### NFR-005 Reliability

Daily performance logs, certification approvals, and feedback records must not be silently lost.

### NFR-006 Maintainability

Business rules should be centralized and tested. UI should reuse shared components and design tokens.

## 8. Data Requirements

Core entities include User, Role, Course, Module, Lesson, BlueprintStep, Script, TalkTrack, Checklist, Quiz, QuizAttempt, RoleplayAssignment, RoleplaySubmission, EvaluationRubric, ManagerFeedback, Certification, Resource, Team, TrainingProgress, GoalSheetEntry, SmartAgentConversation, and SensitiveMaterialAccessLog.

See [Data Model Specification](./06-DATA-MODEL.md).

## 9. External Interfaces

Potential integrations:

- Auth provider.
- AI provider or local AI service.
- File/video storage.
- Push/email notification provider.
- Analytics/monitoring provider.
- Stitch/Figma/Canva design artifacts as design references.

## 10. Risks

- Blueprint inconsistency if training paths are edited casually.
- Compliance risk if pricing/fee/incentive content is exposed or unclear.
- AI hallucination if Smart Agent answers without knowledge grounding.
- Manager trust risk if analytics are inaccurate.
- Adoption risk if mobile workflows feel like generic LMS pages.

## 11. Definition of Done

- Feature satisfies acceptance criteria.
- Blueprint order remains correct.
- Server-side permissions are enforced.
- Sensitive materials are protected.
- Fee/pricing areas include clear disclosure context.
- Loading, empty, error, and success states exist.
- Tests cover impacted business logic.
- Typecheck/build pass where available.

