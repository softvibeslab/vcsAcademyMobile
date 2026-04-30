# Sprint 11-12 Content and Smart Agent Delivery

Date: 2026-04-30

## Goal

Make the launch candidate feel closer to a real academy by expanding demo content and replacing hardcoded Smart Agent branching with a provider-based local knowledge agent.

## Implemented

### Demo Content

- Expanded seeded resource library:
  - Meet and Greet Playbook.
  - Agenda Control Guide.
  - F.O.R.M. Discovery Cards.
  - Step 5 Practice Script.
  - Property Tour Checklist.
  - Model Suite Storytelling.
  - Point of Confirmation Coach.
  - Fee Disclosure Policy.
  - Pricing Guide.
  - Finance Worksheet.
- Added multiple roleplay scenarios:
  - Step 5 Commitment Check.
  - Discovery Motivation.
  - Point of Confirmation Objection.

### Smart Agent

- Added `backend/app/smart_agent.py`.
- Provider interface: `SmartAgentProvider`.
- Local provider: `LocalKnowledgeProvider`.
- Retrieval over Blueprint steps and accessible resources.
- Citations from retrieved knowledge.
- Recommended action routing.
- Sensitive-content guardrails:
  - pricing
  - fees
  - discounts
  - finance
  - hidden-fee requests
- Environment selector: `VCSA_SMART_AGENT_PROVIDER=local`.

## Verification

Passed:

```bash
npm run check
```

The smoke test now verifies Smart Agent citations, pricing guardrails, expanded scenarios, and seeded resource access.
