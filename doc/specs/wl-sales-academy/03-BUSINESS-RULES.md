# Business Rules and Domain Logic

Version: 1.0  
Date: 2026-04-29

## 1. Core Domain Principle

The platform exists to train and verify consistent execution of the official Blueprint of the Sale. All training content, Smart Agent answers, roleplay scenarios, performance metrics, and certification rules must align to this principle.

## 2. Official Blueprint Order

The top-level Blueprint steps are:

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

Rules:

- The UI must display the steps in this order.
- A step may have sub-lessons, but sub-lessons must not become top-level steps without explicit approval.
- First Visit Incentives, 3-Way Pitch, Home Away from Home Program, and Fee Disclosure are sub-lessons.
- Training paths may be filtered or condensed only when clearly labeled as condensed.

## 3. Content Classification

Every training item should have a content classification:

- `training_guidance`: general coachable guidance.
- `practice_script`: words for roleplay/practice.
- `official_approved_material`: approved company content.
- `sensitive_internal`: internal material not for all users.
- `pricing_or_fee_related`: content involving price, fees, incentives, finance, discounts, or program costs.
- `legal_or_contract_reference`: legal/contractual terms, view-only unless authorized.

Rules:

- Practice scripts must not be presented as legally binding.
- Official content must show an approval label or source label when available.
- Pricing/fee-related content requires disclosure labels and permission checks.

## 4. Role Permissions

### Visitor

Can access only public onboarding/login content.

### Sales Representative

Can:

- View assigned training.
- Use Smart Agent within allowed knowledge.
- Submit GoalSheet entries.
- Practice roleplays.
- View own progress and feedback.

Cannot:

- View other reps' private performance.
- Manage content.
- Access restricted pricing/program material unless granted.

### Trainer / Coach

Can:

- Assign modules to reps in scope.
- Review roleplays.
- Score rubrics.
- Provide feedback.
- Recommend readiness.

Cannot:

- Change admin settings.
- View sensitive materials outside granted scope.

### Manager / T.O. Manager

Can:

- View team progress.
- Review Point of Confirmation and T.O. readiness.
- Approve or deny certification readiness.
- View team GoalSheet summaries if allowed.

Cannot:

- Edit global content unless also trainer/admin.

### Admin

Can:

- Manage users, roles, content, settings, resources, and access.
- View analytics across academy.
- Grant sensitive material access.

## 5. Server-Side Authorization

Rules:

- Client-side role checks are never sufficient.
- Every protected API route must validate authenticated user and role.
- Every team-scoped query must filter by authorized team/org scope.
- Sensitive material access must be checked server-side before returning URLs, text, or metadata.

## 6. Smart GoalSheet Business Rules

### Required Fields

Minimum save requirements:

- Date.
- Tour outcome.
- Sales outcome.
- Number of sales.
- Sales volume if sold.

### Tour Outcomes

Allowed values:

- Qualified.
- Close Today.
- Not Qualified.
- No Tour.

### Sales Outcomes

Allowed values:

- Sold.
- Did Not Sell.

Rules:

- If sold, sales volume must be numeric and non-negative.
- If number of sales is greater than 0, sales outcome should be sold.
- If not sold, no-sale reason should be encouraged.
- Manager/T.O. field is optional unless org policy requires it.

### Metrics

Closing percentage:

```text
closing_rate = sales_count / qualified_tours
```

VPG:

```text
vpg = sales_volume / qualified_tours
```

Volume:

```text
volume = sum(sales_volume for date range)
```

Rules:

- Avoid division by zero.
- Metrics must clearly label sample data vs real data.
- Goal comparisons must use configured goals, not hardcoded production values.

## 7. Follow-Up Rules

- Follow-ups can be attached to a GoalSheet entry.
- Each follow-up should include date and note.
- Reminders must be scoped to the creating user and authorized managers.

## 8. Training Progress Rules

Completion can be earned through:

- Lesson completed.
- Video watched or marked complete.
- Checklist completed.
- Quiz passed.
- Roleplay submitted and/or approved.
- Manager sign-off.

Rules:

- Progress percentage should be deterministic.
- Locked steps should unlock according to course/certification rules.
- Manual overrides require manager/admin permission and audit record.

## 9. Certification Rules

A rep can be certified only when all configured requirements are complete:

- Required Blueprint modules complete.
- Required quizzes passed.
- Required roleplays submitted.
- Minimum rubric scores met.
- Manager/trainer approval complete.
- Sensitive compliance/fee modules complete if required.

Rules:

- Certification date and approver must be stored.
- Revocation or expiration should be supported if org policy requires it.

## 10. Roleplay Rules

- Roleplay must map to one or more Blueprint steps.
- Scenarios should include role, objective, buyer concern, success criteria, and rubric.
- AI feedback must be labeled as coaching feedback.
- Manager feedback overrides AI readiness decisions when certification is involved.

## 11. Fee and Pricing Disclosure Rules

Rules:

- Any feature involving fees, pricing, finance, incentives, discounts, upgrades, activation fees, exchange fees, booking fees, concierge fees, or membership fees must include clear disclosure language.
- Do not hide or omit fees in training flows.
- Do not create fake pricing or fake incentives as if real.
- Use placeholders unless authorized values are provided.
- Smart Agent must not invent specific pricing or incentive claims.

## 12. Audit Rules

Audit events should be recorded for:

- Sensitive resource access.
- Role changes.
- Certification approvals/denials.
- Admin content updates.
- Manager score submissions.
- Pricing/fee material access.

Minimum audit fields:

- actor_user_id.
- action.
- target_type.
- target_id.
- timestamp.
- outcome.
- metadata.

