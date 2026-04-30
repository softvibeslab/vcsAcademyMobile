# Product Requirements Specification

Product: WL | White Label Sales Academy  
Version: 1.0  
Date: 2026-04-29

## 1. Product Vision

WL | White Label Sales Academy is the daily operating system for sales mastery. It combines structured Blueprint training, AI coaching, roleplay, performance logging, and manager feedback into one premium mobile-first academy.

The product should feel like a private AI sales coach in the rep's pocket: polished, direct, premium, and operationally useful.

## 2. Positioning

This is not a generic learning app. It is a structured sales training, roleplay, compliance, and performance platform designed around the official Blueprint of the Sale.

Core promise:

> Train the right way, practice the right conversations, disclose clearly, and execute the Blueprint with consistency.

## 3. Target Users

### Primary

Sales representatives who need to master the sales process, prepare for live presentations, roleplay difficult moments, and track performance.

### Secondary

Trainers, coaches, managers, T.O. managers, and admins who need to assign, evaluate, certify, and improve team execution.

## 4. Business Goals

- Improve consistency of sales presentations.
- Reduce skipped or weak Blueprint steps.
- Increase readiness before live presentations.
- Increase daily performance logging.
- Improve roleplay volume and feedback quality.
- Make fee/pricing disclosure training visible and auditable.
- Give managers better visibility into rep readiness.

## 5. Product Goals

- Mobile-first app experience for reps.
- Clear Blueprint progress path.
- Smart Agent guidance available from every major workflow.
- Roleplay Live experience tied to Blueprint steps.
- Smart GoalSheet turns daily metrics into coaching insights.
- Manager/trainer workflows support review, scoring, and certification.
- Admin tools protect sensitive content and manage official training assets.

## 6. Personas

### Rep: Chris

Needs:

- Know what to train today.
- Practice before a tour.
- Ask Smart Agent for objection handling.
- Log daily outcomes quickly.
- See progress toward certification.

Pain points:

- Forgets exact step order.
- Needs confidence with commitment, fees, pricing, and manager handoff.
- Needs fast feedback without waiting for manager availability.

### Trainer: Sofia

Needs:

- Assign modules.
- Review roleplay submissions.
- Score rubrics.
- Provide feedback.
- Identify common weak steps.

### Manager/T.O. Manager: Marcus

Needs:

- See readiness by rep.
- Review Point of Confirmation and T.O. quality.
- Approve certification.
- Track team skill gaps.

### Admin: Ana

Needs:

- Manage content, roles, sensitive materials, users, and settings.
- Ensure official content is protected and accurate.

## 7. Core Product Pillars

### Pillar 1: Blueprint Mastery

Structured path with 11 steps, progress, scripts, checklists, quizzes, and roleplays.

### Pillar 2: Smart Agent Coaching

AI coach for questions, roleplay, step guidance, objection handling, and performance insights.

### Pillar 3: Roleplay and Practice

Live-style practice flows with AI coach, scenarios, scoring, and feedback.

### Pillar 4: Performance Logging

Smart GoalSheet for tours, sales, reasons, metrics, follow-ups, notes, and daily insights.

### Pillar 5: Manager Evaluation

Rubrics, coaching notes, feedback, sign-off, and certification readiness.

### Pillar 6: Compliance and Access Control

Clear disclosures, permissioned sensitive content, audit logs, and training/legal distinction.

## 8. MVP Screens

### Welcome / Onboarding

Purpose:

- Establish premium AI sales academy brand.
- Introduce Smart Agent.
- Route user into app or account access.

Requirements:

- WL Sales Academy logo.
- Smart Agent eye visual.
- Feature cards: AI Coaching, Real Practice, Performance.
- CTA: Enter Sales Academy.

### Smart Agent Introduction

Purpose:

- Explain Smart Agent value.

Requirements:

- AI coach visual.
- Floating benefits.
- Feature cards.
- CTA: Get Started.

### Home Dashboard

Purpose:

- Daily hub.

Requirements:

- Greeting.
- Smart Agent card with ask input.
- Quick prompt chips.
- Today's Progress metrics.
- Quick Access tiles.
- Bottom navigation.

### Top Producer Roadmap

Purpose:

- Blueprint mastery path.

Requirements:

- Current stage and progress.
- 11-step list.
- Completed/current/upcoming visual states.
- Today Focus card.

### Blueprint Step Detail

Purpose:

- Deep training view for a Blueprint step.

Requirements:

- Step metadata.
- Watch, Script, Audio cards.
- Context/compliance notes.
- CTA: Run Step.

### Roleplay Live

Purpose:

- AI-supported simulated live coaching session.

Requirements:

- Scenario info.
- Coach/rep tiles.
- Controls.
- Tip card.

### Smart GoalSheet

Purpose:

- Daily sales performance entry and AI insight.

Requirements:

- Tour section.
- Sales section.
- No-sale reason.
- Metrics.
- Follow-up reminders.
- Notes.
- Smart Agent Insight.
- Save CTA.

## 9. Success Metrics

Activation:

- % new reps who complete first onboarding.
- % users who open Smart Agent in first session.

Engagement:

- Daily active users.
- Smart Agent messages per active user.
- Roleplay sessions per week.
- GoalSheet completion rate.
- Blueprint step completion rate.

Readiness:

- Average Blueprint completion.
- Average roleplay score.
- % reps certified.
- Time to certification.

Compliance:

- % fee/pricing modules completed.
- Sensitive content access attempts blocked.
- Sensitive material access logs created.

Manager impact:

- Pending review count.
- Feedback turnaround time.
- Reps ready for live presentations.

## 10. MVP Priorities

P0:

- Authentication and role-aware shell.
- Mobile visual system.
- Home Dashboard.
- Roadmap and Step Detail.
- Smart GoalSheet.
- Roleplay Live UI.
- Smart Agent basic guidance.
- Server-side access checks for sensitive content.

P1:

- Quizzes and scoring.
- Roleplay submissions and manager feedback.
- Certification logic.
- Resource library with permissions.
- Analytics dashboards.

P2:

- Push/email reminders.
- Advanced Smart Agent memory.
- Rich manager dashboards.
- Audit reporting.
- Content authoring workflows.

## 11. Out of Scope for MVP

- Real-time video infrastructure, unless separately approved.
- Production pricing/incentive values.
- Legal contract generation.
- Public marketplace/community.
- Complex CRM replacement.

## 12. Open Questions

- Final auth provider for production.
- Final database/persistence layer for the mobile-first academy flow.
- Whether Smart Agent will use a hosted model, local Ollama, or hybrid provider.
- Required official scripts and approval workflow.
- Exact manager hierarchy and team assignment rules.

