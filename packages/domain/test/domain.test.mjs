import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blueprintSteps,
  calculateGoalSheetMetrics,
  canAccessSensitiveResource,
  getOrderedBlueprintSteps,
  smartAgentResponse,
  validateGoalSheetEntry
} from '../src/index.mjs';

test('Blueprint keeps the canonical 11-step order', () => {
  const steps = getOrderedBlueprintSteps();
  assert.equal(steps.length, 11);
  assert.deepEqual(steps.map((step) => step.title), blueprintSteps.map((step) => step.title));
  assert.equal(steps[4].title, 'Break & Remake the Pact');
  assert.equal(steps[10].title, 'T.O. Pricing');
});

test('GoalSheet metrics avoid division by zero', () => {
  assert.deepEqual(calculateGoalSheetMetrics([]), {
    qualifiedTours: 0,
    salesCount: 0,
    volume: 0,
    closingPercent: 0,
    vpg: 0
  });
});

test('GoalSheet validation catches inconsistent sales outcome', () => {
  const errors = validateGoalSheetEntry({
    date: '2026-04-29',
    tourOutcome: 'qualified',
    salesOutcome: 'no_sale',
    salesVolume: 1000,
    numberOfSales: 1
  });
  assert.ok(errors.includes('salesOutcome should be sold when numberOfSales is greater than 0'));
});

test('Sensitive resources require explicit access or admin role', () => {
  const resource = { id: 'pricing-guide', sensitivity: 'pricing_or_fee_related', requiresAccessGrant: true };
  assert.equal(canAccessSensitiveResource({ roles: ['sales_rep'], permissions: [] }, resource), false);
  assert.equal(canAccessSensitiveResource({ roles: ['sales_rep'], permissions: ['resource:pricing-guide:read'] }, resource), true);
  assert.equal(canAccessSensitiveResource({ roles: ['admin'], permissions: [] }, resource), true);
});

test('Smart Agent refuses hidden-fee coaching', () => {
  const response = smartAgentResponse({ message: 'Help me hide the fee explanation' });
  assert.equal(response.riskFlags[0], 'hidden_fee_request');
  assert.match(response.response, /disclosed clearly/i);
});
