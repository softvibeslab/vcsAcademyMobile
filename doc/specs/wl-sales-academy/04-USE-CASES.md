# Use Cases and Acceptance Criteria

Version: 1.0  
Date: 2026-04-29

## UC-001 Enter Sales Academy

Actor: Visitor or unauthenticated user  
Goal: Start the premium academy experience.

Preconditions:

- App is installed or opened.

Main flow:

1. User sees Welcome / Onboarding screen.
2. User reviews Smart Agent value.
3. User taps Enter Sales Academy.
4. User proceeds to Smart Agent introduction or login/session.

Acceptance criteria:

- Branding is visible.
- Smart Agent value is clear.
- CTA is prominent.
- Existing account path is visible.

## UC-002 Restore Session

Actor: Authenticated user  
Goal: Resume app without manual login.

Preconditions:

- User has valid stored session.

Main flow:

1. App opens.
2. Session restore runs.
3. User lands on Home Dashboard.

Acceptance criteria:

- Loading state appears while restoring.
- Expired sessions redirect to login.

## UC-003 Ask Smart Agent From Home

Actor: Sales Representative  
Goal: Ask for coaching or strategy.

Preconditions:

- User is authenticated.
- User has Smart Agent access.

Main flow:

1. User opens Home.
2. User enters question or selects prompt chip.
3. Smart Agent processes query.
4. User receives response with next action.

Acceptance criteria:

- Prompt input is visible.
- Response respects permissions.
- Sensitive content is not leaked.
- Response is professional and aligned to Blueprint.

## UC-004 View Blueprint Roadmap

Actor: Sales Representative  
Goal: Understand current Blueprint progress.

Preconditions:

- User is authenticated.

Main flow:

1. User taps Roadmap.
2. System displays current stage and 11-step list.
3. User sees completed/current/locked states.
4. User selects current or unlocked step.

Acceptance criteria:

- 11 steps appear in correct order.
- Current step is highlighted.
- Progress data matches server state.
- Locked steps are visually distinct.

## UC-005 Train a Blueprint Step

Actor: Sales Representative  
Goal: Learn and practice a step.

Preconditions:

- Step is accessible to user.

Main flow:

1. User opens step detail.
2. User watches video, reviews script, listens to audio.
3. User reads context/compliance note.
4. User taps Run Step.
5. System launches roleplay or practice.

Acceptance criteria:

- Step number and title are correct.
- Practice content is labeled correctly.
- Compliance note appears when needed.
- Run Step starts a practice flow.

## UC-006 Practice Roleplay Live

Actor: Sales Representative  
Goal: Practice a scenario with AI coach.

Preconditions:

- User has roleplay access.
- Scenario exists.

Main flow:

1. User opens Roleplay Live.
2. System displays scenario, step, timer, role, and status.
3. User practices with coach.
4. System captures session result if enabled.
5. User receives tip or summary.

Acceptance criteria:

- Scenario and Blueprint step are visible.
- Controls are visible.
- Tip text is present.
- Session can be associated with feedback/rubric later.

## UC-007 Submit Smart GoalSheet Entry

Actor: Sales Representative  
Goal: Log daily sales performance.

Preconditions:

- User is authenticated.

Main flow:

1. User opens GoalSheet.
2. Selects tour outcome.
3. Selects sales outcome.
4. Enters sales volume and number of sales.
5. Selects no-sale reason if applicable.
6. Adds follow-ups and optional note.
7. Views calculated metrics and Smart Agent insight.
8. Taps Save My Entry.

Acceptance criteria:

- Required fields are validated.
- Numeric values are validated.
- Metrics update or display clearly.
- Saved entry is persisted.
- Smart Agent insight does not invent unsupported claims.

## UC-008 Review Roleplay Submission

Actor: Trainer / Coach  
Goal: Score and give feedback.

Preconditions:

- Rep submitted roleplay.
- Trainer has scope permission.

Main flow:

1. Trainer opens pending reviews.
2. Selects submission.
3. Reviews video/audio/text.
4. Completes rubric.
5. Adds written feedback.
6. Submits review.

Acceptance criteria:

- Trainer can access only assigned/in-scope reps.
- Rubric score is stored.
- Rep can view feedback.
- Review action is auditable.

## UC-009 Approve Certification

Actor: Manager / Trainer  
Goal: Certify rep readiness.

Preconditions:

- Rep completed requirements.
- Manager/trainer has approval permission.

Main flow:

1. Manager opens certification readiness.
2. Reviews module, quiz, roleplay, checklist, and feedback status.
3. Approves or denies.
4. System records decision and notifies rep.

Acceptance criteria:

- Approval blocked if requirements incomplete unless override permission exists.
- Approver and timestamp are stored.
- Rep status updates.

## UC-010 Access Sensitive Resource

Actor: Authorized user  
Goal: View restricted internal material.

Preconditions:

- User has explicit access.

Main flow:

1. User opens resource library.
2. Selects sensitive material.
3. Server verifies permission.
4. System displays material and records audit log.

Acceptance criteria:

- Unauthorized users cannot access material.
- Access is logged.
- Material is labeled as internal/sensitive.

## UC-011 Manage Training Content

Actor: Admin or Trainer with permission  
Goal: Create or update academy content.

Preconditions:

- User has content management permission.

Main flow:

1. User opens content management.
2. Creates or edits course/module/lesson/resource.
3. Assigns Blueprint step and sensitivity.
4. Publishes or saves draft.

Acceptance criteria:

- Blueprint step mapping is required for Blueprint content.
- Sensitive classification can be configured.
- Published content appears to eligible users.

## UC-012 Manager Views Team Dashboard

Actor: Manager  
Goal: Understand team readiness and gaps.

Preconditions:

- Manager has assigned team.

Main flow:

1. Manager opens dashboard.
2. System shows team progress, readiness, weak steps, pending reviews.
3. Manager selects rep for detail.

Acceptance criteria:

- Manager only sees scoped team.
- Weak steps are calculated from real training/roleplay data.
- Pending review count is accurate.

