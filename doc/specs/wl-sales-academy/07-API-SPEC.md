# API and Integration Specification

Version: 1.0  
Date: 2026-04-29

## 1. API Principles

- All protected endpoints require authentication.
- Server must enforce roles and team/org scope.
- Sensitive data must not be returned unless authorized.
- Validation errors should be actionable and safe.
- API should support mobile-first usage with compact response shapes.

## 2. Response Envelope

Recommended response format:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

Error format:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this resource."
  }
}
```

## 3. Auth

### GET /api/mobile/me

Returns current user, roles, and scoped permissions.

### POST /api/auth/login

Existing login route if applicable.

## 4. Blueprint

### GET /api/blueprint/steps

Returns ordered Blueprint steps.

Required:

- Must always return canonical order.

Response data:

```json
{
  "steps": [
    {
      "id": "step_1",
      "step_number": 1,
      "title": "Meet & Greet",
      "description": "Make a great first impression.",
      "progress_percent": 100,
      "status": "completed"
    }
  ]
}
```

### GET /api/blueprint/steps/{stepId}

Returns step detail, lessons, scripts, media, checklist, and practice CTA.

Authorization:

- User must have access to step content.
- Sensitive materials filtered by access.

### POST /api/blueprint/steps/{stepId}/complete

Marks step or completion criteria complete if allowed.

## 5. Smart Agent

### POST /api/smart-agent/chat

Request:

```json
{
  "message": "How should I practice Step 5?",
  "mode": "roadmap",
  "module_area": "blueprint",
  "conversation_history": []
}
```

Response:

```json
{
  "success": true,
  "data": {
    "response": "Practice the commitment-setting language professionally...",
    "citations": [],
    "recommended_actions": [
      {
        "label": "Run Step 5 Roleplay",
        "route": "RoleplayLive",
        "params": { "step": 5 }
      }
    ]
  }
}
```

Rules:

- Must respect content permissions.
- Must not invent pricing/incentives.
- Should cite knowledge when available.

### POST /api/smart-agent/insights/goalsheet

Generates an insight for GoalSheet entry.

## 6. GoalSheet

### GET /api/goalsheet/today

Returns today's entry or defaults.

### POST /api/goalsheet

Creates or updates a daily entry.

Request:

```json
{
  "date": "2026-04-29",
  "tour_outcome": "qualified",
  "sales_outcome": "sold",
  "sales_volume": 8450,
  "number_of_sales": 1,
  "manager_to_name": "Optional Name",
  "no_sale_reason": null,
  "follow_ups": [
    {
      "follow_up_date": "2026-05-01",
      "note": "Send brochure and pricing placeholders"
    }
  ],
  "notes": "Optional notes"
}
```

Validation:

- date required.
- tour_outcome required.
- sales_outcome required.
- sales_volume non-negative.
- number_of_sales integer >= 0.
- no_sale_reason encouraged when sales_outcome is no_sale.

### GET /api/goalsheet/history

Query:

- date_from
- date_to
- user_id if manager/admin and scoped.

### GET /api/goalsheet/metrics

Returns closing %, VPG, volume, goal progress, trend comparisons.

## 7. Roleplay

### GET /api/roleplay/scenarios

Filters:

- blueprint_step_id
- category
- difficulty

### POST /api/roleplay/sessions

Creates roleplay session.

### POST /api/roleplay/sessions/{sessionId}/complete

Completes session and stores summary/score.

### POST /api/roleplay/submissions

Creates submission for manager/trainer review.

### GET /api/roleplay/submissions/pending

Trainer/manager only, scoped by team/org.

### POST /api/roleplay/submissions/{submissionId}/review

Submits rubric score and feedback.

## 8. Courses and Content

### GET /api/courses

Returns courses available to user.

### GET /api/modules/{moduleId}

Returns module detail.

### POST /api/admin/content

Admin/trainer content creation endpoint.

Rules:

- Must include content classification.
- Must include sensitivity metadata if needed.

## 9. Resources

### GET /api/resources

Filters:

- blueprint_step_id
- resource_type
- sensitivity
- tags

### GET /api/resources/{resourceId}

Rules:

- Server validates access.
- Sensitive material access creates log.

## 10. Certification

### GET /api/certifications/me

Returns rep certification status.

### GET /api/certifications/readiness/{userId}

Manager/trainer scoped.

### POST /api/certifications/{certificationId}/approve

Manager/trainer permission required.

### POST /api/certifications/{certificationId}/deny

Requires feedback reason.

## 11. Dashboards

### GET /api/dashboard/rep

Returns:

- certification status.
- assigned modules.
- next lesson.
- quiz scores.
- roleplay submissions.
- feedback.
- Blueprint progress.

### GET /api/dashboard/trainer

Returns:

- assigned reps.
- pending reviews.
- skill gaps.
- recommendations.

### GET /api/dashboard/manager

Returns:

- team progress.
- reps ready.
- reps needing coaching.
- weak steps.
- roleplay scores.

### GET /api/dashboard/admin

Returns:

- users.
- completions.
- content status.
- role permissions.
- sensitive access summary.

## 12. Integrations

### AI Provider

Smart Agent may use:

- Hosted AI provider.
- Local Ollama service.
- Hybrid fallback.

### Storage

Used for:

- videos.
- audio.
- roleplay submissions.
- internal documents.

### Notification Provider

Used for:

- follow-up reminders.
- review requests.
- certification updates.

## 13. API Test Requirements

Every protected endpoint should test:

- unauthenticated request.
- wrong role.
- wrong team/org scope.
- authorized success.
- validation errors.
- sensitive content filtering.

