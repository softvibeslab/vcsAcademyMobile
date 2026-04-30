# Sprint 13-15 Manager and Admin Workflows

Date: 2026-04-30

## Goal

Complete the launch-demo operating workflows for managers and admins so the academy can be run end to end with demo data.

## Implemented

### Backend

- Admin permission grant/revoke endpoint:
  - `POST /api/admin/users/{user_id}/permissions`
- Permission updates are persisted to user records.
- Permission changes are audited.
- E2E smoke verifies sensitive pricing access can be granted.

### Web Manager

- Team dashboard remains role-gated.
- Pending roleplay submissions are visible.
- Managers can submit a demo rubric review for the first pending submission.
- Managers can mark a rep as needs practice or approved for certification.

### Web Admin

- Invite demo rep from the admin workspace.
- Enable/disable invited rep.
- Grant pricing access to a rep.
- Publish Go Live resource.
- View users, content, and audit events.

## Verification

Passed:

```bash
npm run check
```

Full release validation is run before final push for this block.
