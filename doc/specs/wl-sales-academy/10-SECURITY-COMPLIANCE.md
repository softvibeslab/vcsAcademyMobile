# Security, Permissions, and Compliance Specification

Version: 1.0  
Date: 2026-04-29

## 1. Security Goals

- Protect user accounts.
- Protect rep performance data.
- Protect sensitive sales, pricing, fee, incentive, program, worksheet, and internal materials.
- Prevent unauthorized manager/admin access.
- Prevent Smart Agent from leaking restricted content.
- Preserve auditability for sensitive actions.

## 2. Data Classification

### Public

Examples:

- General landing copy.
- Basic onboarding.

### Internal Training

Examples:

- General Blueprint training.
- Non-sensitive scripts.
- Practice scenarios.

### Restricted Internal

Examples:

- Program details.
- Internal worksheets.
- Manager notes.
- Detailed rubric results.

### Sensitive Pricing/Fee/Incentive

Examples:

- Pricing worksheets.
- First visit incentive details.
- Finance explanations.
- Activation, booking, concierge, exchange, or membership fees.

### Personal/Performance Data

Examples:

- GoalSheet entries.
- Quiz attempts.
- Roleplay submissions.
- Manager feedback.
- Certification status.

## 3. Permission Rules

- Users can always view their own allowed training and own performance.
- Managers can view team data only within scope.
- Trainers can review assigned/in-scope submissions.
- Admins can manage global content and access.
- Sensitive content requires explicit permission or role-based grant.

## 4. Server-Side Enforcement

Every protected endpoint must:

1. Verify session.
2. Load current user.
3. Resolve roles and scopes.
4. Check action permission.
5. Filter query by scope.
6. Redact fields if needed.
7. Log sensitive access where required.

## 5. Sensitive Content Display Rules

Required UI treatment:

- Label as Internal, Restricted, or Pricing/Fee Related.
- Show disclosure note where fees/pricing/incentives are involved.
- Hide from unauthorized users.
- Avoid showing preview text if preview itself is sensitive.

## 6. Fee Disclosure Rules

Any fee/pricing feature must:

- Clearly label sample/placeholder values.
- Include disclosure context.
- Never hide or minimize fees.
- Avoid implying legal/contractual terms unless approved.
- Include access checks.

## 7. Smart Agent Compliance

Smart Agent must:

- Use permission-aware retrieval.
- Decline requests to hide fees or mislead clients.
- Avoid fabricated pricing/incentives.
- Label practice language.
- Recommend manager/legal review for official terms.

## 8. Audit Events

Audit these events:

- Sensitive resource viewed.
- Sensitive resource denied.
- Role granted/revoked.
- Content published/archived.
- Certification approved/denied/revoked.
- Manager feedback submitted.
- Pricing/fee content accessed.
- Smart Agent sensitive request blocked.

## 9. Privacy

Rules:

- Rep performance is private to rep and authorized managers/trainers/admins.
- Client information should not be stored unless required and approved.
- If client notes exist, minimize personally identifiable information.
- Do not expose client data publicly.

## 10. Input Validation

Validate server-side:

- IDs.
- dates.
- enum values.
- numeric fields.
- text length.
- file type/size for uploads.
- role/scope transitions.

## 11. File Security

Rules:

- Use signed URLs or protected download routes for sensitive files.
- Do not store secrets in frontend.
- Do not commit API keys.
- Validate file uploads.
- Scan or restrict file types where possible.

## 12. Compliance Acceptance Checklist

- [ ] Protected APIs enforce auth.
- [ ] Role checks happen server-side.
- [ ] Sensitive materials are permissioned.
- [ ] Sensitive access is logged.
- [ ] Pricing/fee screens include disclosure context.
- [ ] Smart Agent has compliance guardrails.
- [ ] Admin role changes are auditable.
- [ ] Rep performance data is team-scoped.

