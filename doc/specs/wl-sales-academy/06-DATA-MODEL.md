# Data Model Specification

Version: 1.0  
Date: 2026-04-29

## 1. Modeling Principles

- Preserve Blueprint order as explicit data.
- Store permissions and sensitivity metadata with content.
- Store user progress as event-friendly records.
- Keep AI conversations and generated insights auditable.
- Avoid hardcoding pricing or incentives.

## 2. Core Entities

### User

Fields:

- id
- email
- display_name
- avatar_url
- status
- created_at
- updated_at

Relationships:

- has many UserRole.
- belongs to Team optionally.
- has many TrainingProgress.
- has many GoalSheetEntry.
- has many RoleplaySubmission.

### Role

Allowed roles:

- visitor
- sales_rep
- trainer
- coach
- manager
- to_manager
- admin

### UserRole

Fields:

- id
- user_id
- role
- scope_type: global, organization, team
- scope_id
- granted_by
- granted_at

### Team

Fields:

- id
- organization_id
- name
- manager_id
- active

### BlueprintStep

Fields:

- id
- step_number
- title
- canonical_title
- short_description
- purpose
- status
- required_for_certification

Seed data:

| step_number | title |
|---:|---|
| 1 | Meet & Greet |
| 2 | Agenda |
| 3 | Breakfast / F.O.R.M. |
| 4 | Discovery / Survey |
| 5 | Break & Remake the Pact |
| 6 | Property Tour |
| 7 | Model Suite |
| 8 | Screen Tour & Flower |
| 9 | Point of Confirmation |
| 10 | Programs |
| 11 | T.O. Pricing |

### Course

Fields:

- id
- title
- description
- audience_role
- status
- created_by

### Module

Fields:

- id
- course_id
- blueprint_step_id
- title
- description
- order_index
- status
- required_for_certification

### Lesson

Fields:

- id
- module_id
- title
- lesson_type: video, text, audio, checklist, script, quiz, roleplay
- content_body
- media_url
- order_index
- sensitivity
- official_status

### Resource

Fields:

- id
- title
- resource_type: document, video, audio, script, checklist, worksheet, policy
- blueprint_step_id
- url_or_storage_key
- summary
- sensitivity
- requires_access_grant
- tags
- published

### Script

Fields:

- id
- blueprint_step_id
- title
- body
- script_type: practice, official, example
- compliance_note
- sensitivity
- version
- approved_by
- approved_at

### Checklist

Fields:

- id
- blueprint_step_id
- title
- items
- required_for_completion

### Quiz

Fields:

- id
- module_id
- title
- passing_score
- max_attempts
- required_for_certification

### QuizQuestion

Fields:

- id
- quiz_id
- question_text
- question_type
- options
- correct_answer
- explanation

### QuizAttempt

Fields:

- id
- quiz_id
- user_id
- score
- passed
- answers
- started_at
- completed_at

### RoleplayAssignment

Fields:

- id
- blueprint_step_id
- title
- scenario
- buyer_context
- objective
- success_criteria
- rubric_id
- required_for_certification

### RoleplaySubmission

Fields:

- id
- assignment_id
- user_id
- submission_type: live_ai, video, audio, text
- transcript
- media_url
- ai_summary
- ai_score
- status: draft, submitted, reviewed, returned, approved
- submitted_at

### EvaluationRubric

Fields:

- id
- title
- criteria
- max_score
- passing_score

Criterion example:

```json
{
  "name": "Professional tone",
  "max_points": 5,
  "description": "Keeps the conversation clear, respectful, and non-manipulative."
}
```

### ManagerFeedback

Fields:

- id
- submission_id
- reviewer_id
- score
- rubric_scores
- comments
- recommendation
- created_at

### Certification

Fields:

- id
- user_id
- certification_type
- status: not_started, in_progress, ready_for_review, approved, denied, expired, revoked
- issued_by
- issued_at
- expires_at
- notes

### TrainingProgress

Fields:

- id
- user_id
- entity_type: course, module, lesson, blueprint_step, checklist, quiz, roleplay
- entity_id
- status: not_started, in_progress, completed, failed, waived
- progress_percent
- completed_at
- source

### GoalSheetEntry

Fields:

- id
- user_id
- date
- tour_outcome
- sales_outcome
- sales_volume
- number_of_sales
- manager_to_name
- no_sale_reason
- closing_percent
- vpg
- volume
- notes
- smart_agent_insight
- created_at
- updated_at

### FollowUpReminder

Fields:

- id
- goal_sheet_entry_id
- user_id
- follow_up_date
- note
- status: pending, completed, dismissed

### SmartAgentConversation

Fields:

- id
- user_id
- mode
- module_area
- messages
- citations
- created_at
- updated_at

### SmartAgentInsight

Fields:

- id
- user_id
- source_type: goalsheet, roleplay, roadmap, quiz, dashboard
- source_id
- insight_text
- recommended_actions
- confidence
- created_at

### SensitiveMaterialAccessLog

Fields:

- id
- actor_user_id
- resource_id
- action
- outcome
- reason
- ip_address
- user_agent
- created_at

## 3. Suggested Indexes

- User.email unique.
- UserRole.user_id + role + scope.
- BlueprintStep.step_number unique.
- Module.course_id + order_index.
- Lesson.module_id + order_index.
- TrainingProgress.user_id + entity_type + entity_id.
- GoalSheetEntry.user_id + date unique.
- RoleplaySubmission.user_id + assignment_id.
- SensitiveMaterialAccessLog.actor_user_id + created_at.
- Resource.blueprint_step_id + sensitivity.

## 4. Derived Metrics

### Blueprint Completion

```text
completed_required_steps / total_required_steps
```

### Step Progress

```text
completed_required_items_in_step / total_required_items_in_step
```

### Closing Percentage

```text
number_of_sales / qualified_tour_count
```

### VPG

```text
sales_volume / qualified_tour_count
```

### Certification Readiness

```text
all required modules complete
AND required quizzes passed
AND required roleplays approved
AND manager signoff complete
```

