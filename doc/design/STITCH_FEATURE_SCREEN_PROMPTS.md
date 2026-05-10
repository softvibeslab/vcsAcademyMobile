# WL Sales Academy - Feature, Screen and Stitch Prompt Pack

Date: 2026-05-04  
Source of truth reviewed:

- `apps/mobile/App.tsx`
- `backend/app/main.py`
- `doc/specs/wl-sales-academy/wiki`
- `doc/specs/wl-sales-academy/01-SRS.md`
- `doc/design/*`

## 1. Product Intent

WL Sales Academy is a mobile-first AI sales training app for resort/vacation club sales teams. The app helps reps master the official 11-step Blueprint of the Sale, practice with a Smart Agent, log daily performance, receive manager feedback, and move toward certification.

The design direction is premium, iOS-like, black-and-gold, AI-powered, operational, and performance-focused. It should feel closer to a high-end sales cockpit than a generic LMS.

## 2. Global Design System Prompt

Use this as the first/base prompt in Stitch before creating individual screens.

```text
Create a premium mobile-first iOS app design system for "WL | White Label Sales Academy", an AI-powered sales training platform for resort and vacation club sales teams.

Visual style:
- Deep black and near-black background (#020506, #03080b, #071014).
- Gold accents (#ffc21a) and soft pale-gold glow (#ffe58a).
- White primary text, muted blue-gray secondary text.
- Premium glass panels with subtle dark gradients, 1px translucent borders, 8px border radius.
- Elegant, technical, AI-powered feeling, inspired by a Shazam-like intelligent eye interface.
- Avoid cartoon, generic LMS, flat SaaS dashboard, purple gradients, beige palettes, and oversized marketing cards.

Typography:
- Large bold screen titles.
- Compact operational cards.
- No negative letter spacing.
- Use readable mobile sizes.

Iconography:
- Thin line icons similar to Lucide.
- Use icons for Home, Target/Roadmap, Clipboard/GoalSheet, Users/Roleplay, Book/Resources, Headphones/Support, Eye/Smart Agent, Bell, Lock, Calendar, Chart, Mic, Send.

Navigation:
- Bottom tab bar with six tabs: Home, Roadmap, GoalSheet, Roleplay Live, Resources, Support.
- Active tab is gold with a small underline.

Layout:
- Mobile canvas: iPhone 15/16 Pro aspect, safe area aware.
- One-handed use, vertical scroll where needed.
- Dense but polished information hierarchy.
- Buttons and cards must not overflow.
- Cards are individual surfaces only, never cards inside decorative cards.

Brand:
- WL gold serif mark paired with "SALES ACADEMY".
- Smart Agent symbol is a glowing AI eye, not a robot mascot.
```

## 3. App Navigation Map

| Area | Current Surface | Primary User |
|---|---|---|
| Welcome / Smart Agent Intro | Public pre-login screen | Visitor, all roles |
| Login / Role Access | Public login screen | All roles |
| Home Dashboard | `home` tab | Sales rep, all roles |
| Top Producer Roadmap | `roadmap` tab | Sales rep |
| Blueprint Step Detail | nested inside Roadmap | Sales rep |
| Smart GoalSheet | `goalsheet` tab | Sales rep |
| Roleplay Live | `roleplay` tab | Sales rep, coach |
| Resources | `resources` tab | All authenticated roles |
| Support / Profile | `support` tab | All authenticated roles |
| Leadership Workspace | inside Support | Manager, T.O. Manager, Trainer, Coach, Admin |
| Admin Workspace | inside Support | Admin |

## 4. Feature Inventory

| Feature | Current Level | Screen(s) | Notes For Design |
|---|---:|---|---|
| Public Smart Agent intro | High demo | Welcome | Needs glowing eye as first-viewport focus |
| Demo role login | High demo | Login | Role cards: Visitor, Rep, Trainer, Coach, Manager, T.O., Admin |
| Auth/session restoration | Functional | App shell | Include loading/restoring state |
| Home Smart Agent | Functional | Home | Prompt, voice/tap-to-speak, actions, recent coaching |
| Smart Agent actions | Functional | Welcome/Home | Actions route to Roadmap, GoalSheet, Roleplay, Resources, Support |
| Blueprint Roadmap | Functional | Roadmap | 11-step list, current/completed/locked states |
| Blueprint Step Detail | Medium | Step Detail | Needs richer content blocks |
| Smart GoalSheet | Functional | GoalSheet | Tour/sale inputs, metrics, reminders, notes, insight |
| Reminders | Basic functional | GoalSheet | Follow-up reminders from saved GoalSheet entries |
| Roleplay Live | Functional demo+ | Roleplay | AI buyer turn, score card, transcript, submit for review |
| Resource Library | Functional | Resources | Needs search/filter visuals for final design |
| Manager review | Functional demo | Support/Leadership | Pending submissions, readiness, certification actions |
| Certification gates | Functional backend | Support/Leadership | Show requirements blocked/ready/approved |
| Admin users/resources/audit | Functional demo | Support/Admin | Needs real admin layout refinement |
| Notifications | Partial | Header/support future | Bell exists; no full notification center yet |

## 5. Canonical Blueprint Content

The Roadmap must preserve this exact top-level order:

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

Important sub-lessons that should not become top-level Blueprint steps unless approved:

- 3-Way Pitch
- Home Away from Home
- First Visit Incentives
- Fee Disclosure
- Hotel vs timeshare comparisons
- Financing worksheet

## 6. Screen Prompt Pack For Stitch

Each prompt is written as a standalone Stitch prompt. Keep the global design system prompt active, then paste one module prompt at a time.

### 6.1 Welcome / Smart Agent Intro

```text
Design the public welcome screen for WL Sales Academy.

Goal:
Introduce the app as an AI-powered sales intelligence coach. The first viewport must make the Smart Agent eye the hero.

Layout:
- Full-screen black mobile background with subtle gold AI particle/circuit accents.
- Top center: WL gold serif logo, thin vertical divider, "SALES ACADEMY".
- Center: large glowing Smart Agent eye, Shazam-like, with animated-looking circular rings/orbits.
- Four floating callouts around the eye:
  - Analyze / Every Conversation
  - Guide / Every Step
  - Coach / In Real-Time
  - Elevate / Every Result
- Below eye: eyebrow "AI-POWERED SALES INTELLIGENCE".
- Main title: "SMART AGENT".
- Supporting copy: "Tap the Eye. Tell your Agent what you need."
- Glass card: Smart Agent Eye, listening/analyzing state, text input, mic button, quick chips.
- Quick chips: Objections, Roadmap, Closing, Roleplay.
- Action buttons: "Get Started" and "I already have an account".

Interactions/states to show:
- Idle state: Tap Eye to Give Instructions.
- Listening state: glowing ring active, prompt field visible.
- Answered state: agent response and recommended action button.

Style:
Premium black/gold, cinematic glow, iOS safe area, no generic chatbot mascot.
```

### 6.2 Login / Demo Role Access

```text
Design the login and role access screen for WL Sales Academy.

Goal:
Let a demo user select a role and log into the correct workspace.

Layout:
- Top left/back link in gold.
- Brand mark: WL | Sales Academy.
- Center hero: glowing Smart Agent eye badge.
- Large title: "Welcome to Sales Academy" with "Academy" in gold.
- Subtitle: "Your AI-powered partner to train, practice and master every step of the sales process."
- Glass card: "Demo role access".
- Responsive two-column role cards:
  - Visitor
  - Sales Rep
  - Trainer
  - Coach
  - Manager
  - T.O. Manager
  - Admin
- Each role card shows role label, email, one-line access description.
- Second glass card: Secure access with email, password, selected role hint, error state.
- Primary gold CTA: "Enter Sales Academy".

States:
- Selected role highlighted with gold border.
- Auth error red/soft alert.
- Signing in disabled/loading button.

Style:
Dark premium operational UI, compact and readable.
```

### 6.3 Home Dashboard

```text
Design the authenticated Home Dashboard for a Sales Rep in WL Sales Academy.

Goal:
Daily hub with Smart Agent, progress, and quick access.

Layout:
- Header: WL compact brand left, bell icon and circular avatar right.
- Greeting: "Good morning, Chris" with name in gold.
- Subtitle: "Your Smart Agent is ready to provide valuable resources."
- Role chips row.
- Main Smart Agent card:
  - Pill: SMART AGENT.
  - Large glowing eye hero.
  - Title: "Your Smart Agent".
  - Copy: "Ask anything. Get real-time guidance."
  - Gold "Tap to speak" button with mic icon.
  - Prompt input with send button.
  - Quick chips: Objection handling, Deal strategy.
  - Response area.
  - Recommended action buttons.
  - Recent coaching mini-history.
- Today's Progress card:
  - Goal Progress 72%
  - Closing % 28%
  - VPG $8,450
  - Sales Volume $84,500
- Quick Access grid:
  - TPR
  - Goal
  - Roleplay
  - Resources
  - Support
  - Access
- Bottom nav visible.

States:
- Loading/syncing notice.
- Smart Agent thinking.
- Guardrail warning.
- Empty metrics fallback.
```

### 6.4 Smart Agent Modal / Expanded Chat

```text
Design an expanded Smart Agent coaching screen/modal for WL Sales Academy.

Goal:
Turn the home agent into a focused conversational workspace.

Layout:
- Top: Smart Agent eye with active orbit rings.
- Status pill: Listening, Thinking, Coaching, Guardrail.
- Conversation thread:
  - User prompt bubble.
  - Agent answer card.
  - Citations row.
  - Recommended actions.
- Context chips:
  - Blueprint Step
  - GoalSheet
  - Roleplay
  - Resources
  - Manager Assist
- Input area:
  - Mic button
  - Text input
  - Send button
- Footer actions:
  - Open Roadmap
  - Start Roleplay
  - Log GoalSheet

Safety:
- Include guardrail card example: "I cannot invent pricing or hide fees. Use approved resources or ask a manager."

Style:
Premium AI cockpit, not a consumer chat app.
```

### 6.5 Top Producer Roadmap

```text
Design the Top Producer Roadmap screen for WL Sales Academy.

Goal:
Show Blueprint progress and next training focus.

Layout:
- Header: back icon optional, title "Top Producer Roadmap", help pill.
- Subtitle: "Master the blueprint. Execute the perfect sale."
- Progress stage card:
  - Circular progress ring: 73% roadmap complete.
  - Current stage: "4. Discovery / Survey".
  - Description.
  - Progress bar.
  - Status pill: In Progress.
  - Motivational insight: "Keep going!"
- Section title: "Your 11-Step Blueprint".
- Vertical roadmap list with timeline markers.
- Step states:
  - Completed steps are green check.
  - Current step is gold highlighted.
  - Locked/future steps are muted.
- Current row includes action buttons:
  - Continue with Agent.
  - See Script.
- Future rows include:
  - Train This Step.
  - See Script.
- Bottom focus card:
  - Today's Focus.
  - Primary button "Start Now".
  - Secondary "Ask Agent".
- Bottom nav visible.

Blueprint order must be exact 1-11.
```

### 6.6 Blueprint Step Detail

```text
Design a Blueprint Step Detail screen for Step 5: "Break & Remake the Pact".

Goal:
Provide deep training content and a CTA to practice with AI.

Layout:
- Top: "Back to Roadmap" and "How it works".
- Eyebrow: "STEP 5 OF 11".
- Large title: "Break & Remake the Pact (YES / NO TODAY)".
- Badge: High Impact Step.
- Context note explaining when this step happens.
- Card 1: WATCH
  - Title: "How Top Producers Do It".
  - Video thumbnail with play button and duration.
- Card 2: SCRIPT
  - Title: "Exact Words That Close".
  - Quote/talk track block.
  - Button: View Full Script.
  - Compliance note: training language, not official contract language.
- Card 3: AUDIO
  - Play button, waveform, duration.
- Card 4: CHECKLIST
  - Purpose, transition, tone, full disclosure, run roleplay.
- Card 5: COMMON MISTAKES
  - Pressuring the guest.
  - Inventing terms.
  - Skipping disclosure.
- Primary CTA: "Run Step".
- Secondary CTA: "Mark Step Complete".

Style:
Dark premium training screen, content dense but polished.
```

### 6.7 Smart GoalSheet

```text
Design the Smart GoalSheet screen for WL Sales Academy.

Goal:
Let a sales rep log daily tour/sales performance and get Smart Agent insight.

Layout:
- Header with WL brand, bell, avatar.
- Title: "Smart GoalSheet".
- Subtitle: "Log your day. Your Agent turns data into results."
- Top actions:
  - Date selector.
  - View History.
- Section 1: TOUR
  - Option cards: Q Qualified, CT Close Today, NQ Not Qualified, No Tour.
- Section 2: SALES
  - Option cards: Yes, I Sold / No, I Didn't Sell.
  - Inputs: Sales Volume USD, # of Sales.
  - Optional Manager/T.O. selector.
- Section 3: IF NO SALE, WHY?
  - Select list: Price was too high, Needed to think about it, Spouse not present.
- Section 4: YOUR METRICS
  - Closing %, VPG, Volume.
  - Progress bars and trends vs previous period.
- Section 5: FOLLOW UP REMINDER
  - Upcoming follow-up rows from saved reminders.
  - Add/edit follow-up affordance.
- Section 6: ANYTHING ELSE?
  - Notes field with counter.
- Smart Agent Insight card:
  - Eye/spark icon.
  - Coaching summary.
  - Recommended action.
- Primary CTA: Save My Entry.
- History drawer/card.
- Bottom nav visible.

States:
- Sold flow with amount/count.
- No-sale flow with reason.
- Saved state.
- Validation error state.
```

### 6.8 Roleplay Live With AI Buyer

```text
Design the Roleplay Live screen for WL Sales Academy.

Goal:
Simulate a live AI coaching session tied to a Blueprint scenario.

Layout:
- Top header:
  - WL brand left.
  - Title "Roleplay Live".
  - Live status green dot.
  - Participant/chat icons.
  - Red End button.
- Scenario summary card:
  - Scenario: Step 5 Commitment Check.
  - Time elapsed.
  - Session status.
  - Role: You are Rep, AI is Buyer.
- Choose Scenario card:
  - Scenario list with difficulty badges.
- Video/participant panels:
  - AI Buyer / Coach panel.
  - You (Rep) panel.
  - Speaking indicators.
- Control dock:
  - Mute.
  - Stop Video.
  - Share Screen.
  - Chat.
  - More.
- Tip card with scenario-specific buyer context.
- AI Buyer Practice card:
  - Conversation turns:
    - You: ...
    - Buyer: ...
    - Coach: ...
  - Input: "Say your next line..."
  - Send button.
  - Score card: 85/100, rubric chips.
- Transcript field.
- Actions:
  - Start Session.
  - Complete.
  - Submit for Review.
- My Submissions card with status and manager feedback.

Style:
Looks like a premium coaching call, not a generic video chat clone.
```

### 6.9 Resource Library

```text
Design the Resources screen for WL Sales Academy.

Goal:
Show approved scripts, checklists, videos, audio, worksheets, and sensitive resources with access control.

Layout:
- Header: "Resources".
- Subtitle: "Approved training, scripts, checklists and sensitive-access content."
- Search bar.
- Filter chips:
  - Blueprint Step
  - Role
  - Type
  - Sensitivity
  - Available only
- Resource cards:
  - Title.
  - Type and sensitivity.
  - Tags.
  - Status badge: Available or Restricted.
  - Lock icon if restricted.
- Open resource detail card:
  - Resource title.
  - Type/sensitivity metadata.
  - Body/summary.
  - Close Resource action.
- Restricted state:
  - "Ask an admin to grant access."
  - Request access button.

Style:
Operational library, searchable and secure.
```

### 6.10 Support / Profile

```text
Design the Support/Profile screen for WL Sales Academy.

Goal:
Provide account, certification, feedback, and support access.

Layout:
- Header: "Support".
- Subtitle: "Access, profile, certification and launch readiness."
- Profile card:
  - Display name.
  - Email.
  - Roles.
  - Certification status.
  - Permissions/access summary.
  - Sign out button.
- Roleplay Feedback cards:
  - Reviewed/submitted status.
  - Manager comments.
  - Recommendation.
- Support contact card:
  - Help center.
  - Contact manager/trainer.
  - Technical support.
- Certification progress card:
  - Blueprint steps complete.
  - Roleplays reviewed.
  - Manager approval.
  - Blocked/ready/approved state.

If user has manager/admin roles, include role-specific workspace cards below.
```

### 6.11 Leadership Workspace

```text
Design the Leadership Workspace for managers, trainers, coaches, and T.O. managers inside WL Sales Academy.

Goal:
Let leadership review team performance, roleplay submissions, and certification readiness.

Layout:
- Card title: "Team Coaching Manager".
- Metrics:
  - Active reps.
  - Pending reviews.
  - Team VPG.
- Rep list:
  - Name.
  - Roadmap progress.
  - Reviewed roleplays.
  - Readiness button.
- Certification readiness detail:
  - Status: in_progress, ready_for_review, needs_practice, approved.
  - Requirement checklist:
    - Blueprint steps complete.
    - Roleplays reviewed.
    - Manager approval.
- Pending submission list:
  - Submission id.
  - Rep name.
  - Status.
  - Review action.
- Review action button opens scoring drawer:
  - Score.
  - Rubric dimensions.
  - Comments.
  - Recommendation.

Style:
Dense manager operations panel optimized for mobile scanning.
```

### 6.12 Admin Workspace

```text
Design the Admin Workspace for WL Sales Academy.

Goal:
Manage users, resources, permissions, and audit events.

Layout:
- Card title: "Users, Resources & Audit".
- Stats:
  - Users.
  - Resources.
  - Audit Events.
- Invite user row:
  - Email input.
  - Invite button.
- User management list:
  - Display name.
  - Email.
  - Roles.
  - Status badge active/inactive.
  - Grant access button.
- Resource management list:
  - Resource title.
  - Status.
  - Restricted/open indicator.
  - Type badge.
- Audit event list:
  - Action.
  - Outcome.
  - Target type/id.
  - Timestamp.
- Future tabs/sections:
  - Courses.
  - Modules.
  - Lessons.
  - Scripts.
  - Quizzes.
  - Rubrics.
  - Certifications.

Style:
Mobile admin panel, compact, secure, no marketing layout.
```

### 6.13 Notifications / Reminders Center

```text
Design a Notifications and Reminders screen for WL Sales Academy.

Goal:
Show upcoming follow-ups, roleplay reviews, assigned modules, and certification tasks.

Layout:
- Header: "Reminders".
- Tabs:
  - Follow Ups.
  - Reviews.
  - Training.
  - Certification.
- Follow-up list:
  - Date.
  - Guest/task note.
  - Source: GoalSheet.
  - Status: scheduled, due today, overdue, completed.
- Review reminders:
  - Pending manager review.
  - Returned with feedback.
- Training reminders:
  - Assigned Blueprint step.
  - Due date.
- Certification reminders:
  - Missing requirement.
  - Ready for review.
- Empty state:
  - Glowing eye icon.
  - "No reminders due. Keep training."

Style:
Clear, calendar-like, operational.
```

## 7. Additional Design States To Generate

Create these after the main screens:

| State | Prompt Summary |
|---|---|
| Loading / restoring session | Brand centered, "Restoring secure session...", subtle eye glow |
| API error notice | Gold or red top notice, safe error copy |
| Smart Agent guardrail | Refusal card for pricing/fee/hide-fee requests |
| Restricted resource | Lock state with request access CTA |
| Certification blocked | Requirements checklist with blocked approval state |
| Certification ready | Requirements complete, approve/needs practice buttons |
| Empty GoalSheet history | Empty history card with CTA to save first entry |
| Empty Roleplay submissions | Empty coaching card with CTA to start session |
| Admin empty audit | Empty audit list state |

## 8. Recommended Stitch Generation Order

1. Global design system prompt.
2. Welcome / Smart Agent Intro.
3. Login / Role Access.
4. Home Dashboard.
5. Roadmap.
6. Step Detail.
7. GoalSheet.
8. Roleplay Live.
9. Resources.
10. Support/Profile.
11. Leadership Workspace.
12. Admin Workspace.
13. Notifications/Reminders.
14. State variants.

## 9. Design QA Checklist

Use this checklist after Stitch generates each screen.

- Does the screen look mobile-first and premium?
- Is the WL brand visible in the first viewport where appropriate?
- Is the Smart Agent represented as an eye, not a generic robot?
- Are black/gold/white colors consistent?
- Are cards 8px radius or less?
- Is the bottom nav present on authenticated primary tabs?
- Does text fit on mobile without overlap?
- Are role-based surfaces visually distinct?
- Does restricted/sensitive content show lock/access states?
- Does the Blueprint preserve the official 11-step order?
- Does every primary action have a clear icon and label?
- Are loading/error/empty states covered?

## 10. Current Implementation References

| Screen/Feature | Code Reference |
|---|---|
| App shell and nav tabs | `apps/mobile/App.tsx` |
| Welcome | `renderWelcome()` |
| Login | `renderLogin()` |
| Home | `renderHome()` |
| Roadmap | `renderRoadmap()` |
| Step Detail | `renderStepDetail()` |
| GoalSheet | `renderGoalSheet()` |
| Roleplay | `renderRoleplay()` |
| Resources | `renderResources()` |
| Leadership | `renderLeadershipWorkspace()` |
| Admin | `renderAdminWorkspace()` |
| Support | `renderSupport()` |
| API routes | `backend/app/main.py` |
| Smart Agent provider | `backend/app/smart_agent.py` |

## 11. Notes For Stitch

- Keep the screen language in English because the current app UI and specs are in English.
- Do not create a landing page. The app starts with the actual Smart Agent welcome experience.
- Do not use generic SaaS admin visuals for the rep app.
- Avoid decorative gradient blobs/orbs. Use intentional AI eye, rings, linework, particles, and operational cards.
- For admin/manager designs, prioritize dense scanning and repeated action over hero composition.
- For Roleplay, make it feel live and interactive, but keep compliance/trust cues visible.
