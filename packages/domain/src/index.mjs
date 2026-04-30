export const blueprintSteps = [
  { id: 'step_1', stepNumber: 1, title: 'Meet & Greet', shortDescription: 'Make a great first impression.', requiredForCertification: true },
  { id: 'step_2', stepNumber: 2, title: 'Agenda', shortDescription: 'Set expectations and control the flow.', requiredForCertification: true },
  { id: 'step_3', stepNumber: 3, title: 'Breakfast / F.O.R.M.', shortDescription: 'Build rapport through family, occupation, recreation, and motivation.', requiredForCertification: true },
  { id: 'step_4', stepNumber: 4, title: 'Discovery / Survey', shortDescription: 'Learn travel patterns, goals, and objections.', requiredForCertification: true },
  { id: 'step_5', stepNumber: 5, title: 'Break & Remake the Pact', shortDescription: 'Confirm commitment before the tour.', requiredForCertification: true },
  { id: 'step_6', stepNumber: 6, title: 'Property Tour', shortDescription: 'Connect the experience to customer goals.', requiredForCertification: true },
  { id: 'step_7', stepNumber: 7, title: 'Model Suite', shortDescription: 'Help the customer imagine ownership.', requiredForCertification: true },
  { id: 'step_8', stepNumber: 8, title: 'Screen Tour & Flower', shortDescription: 'Visualize programs and fit.', requiredForCertification: true },
  { id: 'step_9', stepNumber: 9, title: 'Point of Confirmation', shortDescription: 'Confirm value, fit, and readiness.', requiredForCertification: true },
  { id: 'step_10', stepNumber: 10, title: 'Programs', shortDescription: 'Present approved program options clearly.', requiredForCertification: true },
  { id: 'step_11', stepNumber: 11, title: 'T.O. Pricing', shortDescription: 'Transition pricing with full disclosure.', requiredForCertification: true }
];

export const roles = ['visitor', 'sales_rep', 'trainer', 'coach', 'manager', 'to_manager', 'admin'];

export const contentClassifications = [
  'training_guidance',
  'practice_script',
  'official_approved_material',
  'sensitive_internal',
  'pricing_or_fee_related',
  'legal_or_contract_reference'
];

export function getOrderedBlueprintSteps(progressByStep = {}) {
  return blueprintSteps
    .slice()
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((step) => ({
      ...step,
      progressPercent: progressByStep[step.id] ?? (step.stepNumber === 1 ? 100 : step.stepNumber === 2 ? 35 : 0),
      status: progressByStep[step.id] === 100 ? 'completed' : step.stepNumber <= 2 ? 'current' : 'locked'
    }));
}

export function validateGoalSheetEntry(entry) {
  const errors = [];
  if (!entry.date) errors.push('date is required');
  if (!entry.tourOutcome) errors.push('tourOutcome is required');
  if (!entry.salesOutcome) errors.push('salesOutcome is required');
  const salesVolume = Number(entry.salesVolume ?? 0);
  const numberOfSales = Number(entry.numberOfSales ?? 0);
  if (Number.isNaN(salesVolume) || salesVolume < 0) errors.push('salesVolume must be non-negative');
  if (!Number.isInteger(numberOfSales) || numberOfSales < 0) errors.push('numberOfSales must be a non-negative integer');
  if (numberOfSales > 0 && entry.salesOutcome !== 'sold') errors.push('salesOutcome should be sold when numberOfSales is greater than 0');
  return errors;
}

export function calculateGoalSheetMetrics(entries) {
  const qualifiedTours = entries.filter((entry) => entry.tourOutcome === 'qualified' || entry.tourOutcome === 'close_today').length;
  const salesCount = entries.reduce((sum, entry) => sum + Number(entry.numberOfSales ?? 0), 0);
  const volume = entries.reduce((sum, entry) => sum + Number(entry.salesVolume ?? 0), 0);
  return {
    qualifiedTours,
    salesCount,
    volume,
    closingPercent: qualifiedTours === 0 ? 0 : Math.round((salesCount / qualifiedTours) * 100),
    vpg: qualifiedTours === 0 ? 0 : Math.round(volume / qualifiedTours)
  };
}

export function canAccessSensitiveResource(user, resource) {
  if (!resource.requiresAccessGrant && !['sensitive_internal', 'pricing_or_fee_related', 'legal_or_contract_reference'].includes(resource.sensitivity)) {
    return true;
  }
  if (user.roles?.includes('admin')) return true;
  return Boolean(user.permissions?.includes(`resource:${resource.id}:read`));
}

export function createGoalSheetInsight(entry, metrics) {
  const sold = Number(entry.numberOfSales ?? 0) > 0;
  const focus = sold ? 'Keep reinforcing the Blueprint step that created momentum.' : 'Pick one no-sale reason and practice the matching objection flow.';
  return [
    sold ? `Good work logging ${entry.numberOfSales} sale today.` : 'Good job logging the day honestly.',
    `Current closing rate is ${metrics.closingPercent}%.`,
    focus,
    'Next: run a roleplay tied to the weakest step before the next tour.'
  ].join(' ');
}

export function smartAgentResponse({ message, mode = 'general_coach', role = 'sales_rep' }) {
  const normalized = String(message || '').toLowerCase();
  if (normalized.includes('hide') && normalized.includes('fee')) {
    return {
      response: 'No. Fees and conditions must be disclosed clearly. Practice a transparent explanation and confirm the client understands before moving forward.',
      riskFlags: ['hidden_fee_request'],
      recommendedActions: [{ label: 'Review fee disclosure training', route: 'Resources', params: { tag: 'fee-disclosure' } }]
    };
  }
  if (normalized.includes('price') || normalized.includes('pricing')) {
    return {
      response: 'Use approved pricing materials only. I can help you practice the transition, but I will not invent prices, discounts, or incentives.',
      riskFlags: ['pricing_guardrail'],
      recommendedActions: [{ label: 'Open T.O. Pricing step', route: 'BlueprintStep', params: { step: 11 } }]
    };
  }
  if (normalized.includes('step 5') || normalized.includes('pact')) {
    return {
      response: 'Step 5 is a commitment-setting moment, not pressure. Confirm that if the program makes sense and is affordable, the guest can make a clear yes/no decision today.',
      citations: ['Blueprint Step 5'],
      riskFlags: [],
      recommendedActions: [{ label: 'Run Step 5 Roleplay', route: 'RoleplayLive', params: { blueprintStep: 5 } }]
    };
  }
  return {
    response: `For ${mode}, stay aligned to the Blueprint, keep the language professional, and choose one next action the rep can practice immediately.`,
    citations: role === 'sales_rep' ? ['Blueprint overview'] : ['Manager review guide'],
    riskFlags: [],
    recommendedActions: [{ label: 'Open Roadmap', route: 'Roadmap', params: {} }]
  };
}
