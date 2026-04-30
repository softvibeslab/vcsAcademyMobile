import React, { useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
const SESSION_KEY = 'vcsa_token';

type TabKey = 'home' | 'roadmap' | 'agent' | 'goalsheet' | 'roleplay' | 'resources' | 'profile';

type User = {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
  status: string;
};

type Step = {
  id: string;
  step_number: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'locked';
  progress_percent: number;
};

type Dashboard = {
  greeting: string;
  blueprint_progress: number;
  certification_status: string;
  metrics: {
    closing_percent: number;
    vpg: number;
    qualified_tours?: number;
    sales_count?: number;
    volume?: number;
  };
  next_lesson?: Step;
};

type Resource = {
  id: string;
  title: string;
  resource_type: string;
  sensitivity: string;
  has_access: boolean;
};

type Submission = {
  id: string;
  status: string;
  manager_feedback?: {
    score?: number;
    recommendation?: string;
    comments?: string;
  };
};

type Certification = {
  id: string;
  status: string;
  notes: string;
};

type Scenario = {
  id: string;
  title: string;
  blueprint_step_id: string;
  difficulty: string;
  objective: string;
  buyer_context: string;
};

type GoalSheetEntry = {
  date: string;
  tour_outcome: string;
  sales_outcome: string;
  sales_volume: number;
  number_of_sales: number;
  notes?: string;
  smart_agent_insight?: string;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'agent', label: 'Agent' },
  { key: 'goalsheet', label: 'Goals' },
  { key: 'roleplay', label: 'Roleplay' },
  { key: 'resources', label: 'Library' },
  { key: 'profile', label: 'Profile' }
];

export default function App() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('rep@vcsa.local');
  const [password, setPassword] = useState('demo123');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [feedback, setFeedback] = useState<Submission[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [goalHistory, setGoalHistory] = useState<GoalSheetEntry[]>([]);
  const [goalMetrics, setGoalMetrics] = useState<Dashboard['metrics'] | null>(null);
  const [selectedStepId, setSelectedStepId] = useState('step_2');
  const [agentPrompt, setAgentPrompt] = useState('Help me practice Step 5');
  const [agentResponse, setAgentResponse] = useState('');
  const [goalVolume, setGoalVolume] = useState('8450');
  const [goalSales, setGoalSales] = useState('1');
  const [goalNotes, setGoalNotes] = useState('Strong Step 5 transition.');
  const [roleplayTranscript, setRoleplayTranscript] = useState('Practice transcript with a clear Step 5 commitment check.');
  const [authError, setAuthError] = useState('');
  const [screenMessage, setScreenMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const completedCount = useMemo(() => steps.filter((step) => step.status === 'completed').length, [steps]);
  const selectedStep = steps.find((step) => step.id === selectedStepId) || steps[0];

  async function saveStoredToken(nextToken: string) {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(SESSION_KEY, nextToken);
      return;
    }
    await SecureStore.setItemAsync(SESSION_KEY, nextToken);
  }

  async function readStoredToken() {
    if (Platform.OS === 'web') return window.localStorage.getItem(SESSION_KEY) || '';
    return (await SecureStore.getItemAsync(SESSION_KEY)) || '';
  }

  async function clearStoredToken() {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }

  function clearSession() {
    void clearStoredToken();
    setToken('');
    setUser(null);
    setDashboard(null);
    setSteps([]);
    setResources([]);
    setFeedback([]);
    setCertifications([]);
    setScenarios([]);
    setGoalHistory([]);
    setGoalMetrics(null);
    setAgentResponse('');
    setScreenMessage('');
    setActiveTab('home');
  }

  async function api(path: string, options: RequestInit = {}, sessionToken = token) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
        ...((options.headers as Record<string, string> | undefined) || {})
      }
    });
    const payload = await response.json();
    if (!response.ok) {
      if (response.status === 401) clearSession();
      throw new Error(payload.detail || payload.error?.message || 'Request failed');
    }
    return payload.data;
  }

  async function load(sessionToken = token) {
    if (!sessionToken) return;
    setIsLoading(true);
    try {
      const [meData, dashboardData, stepsData, resourcesData, feedbackData, certificationData, scenariosData, historyData, metricsData] = await Promise.all([
        api('/api/mobile/me', {}, sessionToken),
        api('/api/dashboard/rep', {}, sessionToken),
        api('/api/blueprint/steps', {}, sessionToken),
        api('/api/resources', {}, sessionToken),
        api('/api/roleplay/submissions/mine', {}, sessionToken),
        api('/api/certifications/mine', {}, sessionToken),
        api('/api/roleplay/scenarios', {}, sessionToken),
        api('/api/goalsheet/history', {}, sessionToken),
        api('/api/goalsheet/metrics', {}, sessionToken)
      ]);
      setUser(meData.user);
      setDashboard(dashboardData);
      setSteps(stepsData.steps);
      setResources(resourcesData.resources);
      setFeedback(feedbackData.submissions);
      setCertifications(certificationData.decisions);
      setScenarios(scenariosData.scenarios);
      setGoalHistory(historyData.entries);
      setGoalMetrics(metricsData.metrics);
      if (!stepsData.steps.find((step: Step) => step.id === selectedStepId)) {
        setSelectedStepId(stepsData.steps[0]?.id || 'step_1');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    readStoredToken()
      .then((storedToken) => {
        if (storedToken) setToken(storedToken);
      })
      .finally(() => setIsRestoringSession(false));
  }, []);

  useEffect(() => {
    if (token) {
      load(token).catch((error) => setScreenMessage(`API error: ${error.message}`));
    }
  }, [token]);

  async function login() {
    setIsAuthenticating(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Login failed');
      await saveStoredToken(payload.data.token);
      setToken(payload.data.token);
      await load(payload.data.token);
    } catch (error) {
      clearSession();
      setAuthError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function logout() {
    try {
      if (token) await api('/api/auth/logout', { method: 'POST' });
    } finally {
      clearSession();
    }
  }

  async function askAgent() {
    const data = await api('/api/smart-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message: agentPrompt, mode: 'blueprint_step' })
    });
    setAgentResponse(data.response);
    setScreenMessage(data.risk_flags?.length ? `Guardrail: ${data.risk_flags.join(', ')}` : 'Smart Agent response ready.');
  }

  async function saveGoalSheet() {
    const salesCount = Number(goalSales) || 0;
    const data = await api('/api/goalsheet', {
      method: 'POST',
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        tour_outcome: 'qualified',
        sales_outcome: salesCount > 0 ? 'sold' : 'no_sale',
        sales_volume: Number(goalVolume) || 0,
        number_of_sales: salesCount,
        follow_ups: [{ follow_up_date: '2026-05-01', note: 'Send approved brochure.' }],
        notes: goalNotes
      })
    });
    setScreenMessage(data.entry.smart_agent_insight);
    await load();
  }

  async function completeStep(stepId = selectedStep?.id) {
    if (!stepId) return;
    await api(`/api/blueprint/steps/${stepId}/complete`, { method: 'POST' });
    setScreenMessage('Blueprint step completed.');
    await load();
  }

  async function submitRoleplay() {
    const scenario = scenarios[0];
    if (!scenario) return;
    const sessionData = await api('/api/roleplay/sessions', {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenario.id, blueprint_step_id: scenario.blueprint_step_id })
    });
    await api(`/api/roleplay/sessions/${sessionData.session.id}/complete`, { method: 'POST' });
    await api('/api/roleplay/submissions', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionData.session.id, transcript: roleplayTranscript })
    });
    setScreenMessage('Roleplay submitted for manager review.');
    await load();
  }

  if (isRestoringSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.kicker}>WL Sales Academy</Text>
          <Text style={styles.subtitle}>Restoring secure session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>WL Sales Academy</Text>
            <Text style={styles.title}>Blueprint command center</Text>
            <Text style={styles.subtitle}>Sign in to train, roleplay, log performance, and get compliant coaching.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Secure access</Text>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} style={styles.input} value={email} />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput autoComplete="password" onChangeText={setPassword} secureTextEntry style={styles.input} value={password} />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <TouchableOpacity disabled={isAuthenticating} style={[styles.button, isAuthenticating && styles.disabledButton]} onPress={login}>
              <Text style={styles.buttonText}>{isAuthenticating ? 'Signing in...' : 'Sign in'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.kicker}>WL Sales Academy</Text>
              <Text style={styles.screenTitle}>{tabs.find((tab) => tab.key === activeTab)?.label}</Text>
            </View>
            <Text style={styles.rolePill}>{user?.roles?.[0] || 'rep'}</Text>
          </View>

          {screenMessage ? <Text style={styles.notice}>{screenMessage}</Text> : null}
          {isLoading ? <Text style={styles.muted}>Syncing workspace...</Text> : null}

          {activeTab === 'home' && renderHome()}
          {activeTab === 'roadmap' && renderRoadmap()}
          {activeTab === 'agent' && renderAgent()}
          {activeTab === 'goalsheet' && renderGoalSheet()}
          {activeTab === 'roleplay' && renderRoleplay()}
          {activeTab === 'resources' && renderResources()}
          {activeTab === 'profile' && renderProfile()}
        </ScrollView>

        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab.key} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );

  function renderHome() {
    return (
      <>
        <View style={styles.heroCompact}>
          <Text style={styles.title}>{dashboard?.greeting || 'Ready for today?'}</Text>
          <Text style={styles.subtitle}>Focus on one Blueprint behavior, one roleplay, and one honest GoalSheet entry.</Text>
        </View>
        <View style={styles.metrics}>
          <Metric label="Blueprint" value={`${dashboard?.blueprint_progress ?? 0}%`} />
          <Metric label="Closing" value={`${dashboard?.metrics?.closing_percent ?? 0}%`} />
          <Metric label="VPG" value={`$${dashboard?.metrics?.vpg ?? 0}`} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next best actions</Text>
          <ActionButton label="Ask Smart Agent" onPress={() => setActiveTab('agent')} />
          <ActionButton label="Log GoalSheet" onPress={() => setActiveTab('goalsheet')} secondary />
          <ActionButton label="Run Roleplay" onPress={() => setActiveTab('roleplay')} secondary />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Certification</Text>
          <Text style={styles.bodyText}>Status: {certifications[0]?.status || dashboard?.certification_status || 'in_progress'}</Text>
          <Text style={styles.bodyText}>Completed steps: {completedCount}/11</Text>
          {certifications[0]?.notes ? <Text style={styles.insight}>{certifications[0].notes}</Text> : null}
        </View>
      </>
    );
  }

  function renderRoadmap() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Producer Roadmap</Text>
          <Text style={styles.bodyText}>Select a step to inspect the training detail, then mark practice complete when ready.</Text>
        </View>
        {steps.map((step) => (
          <TouchableOpacity key={step.id} style={[styles.step, selectedStepId === step.id && styles.stepSelected]} onPress={() => setSelectedStepId(step.id)}>
            <View style={styles.stepTextBlock}>
              <Text style={styles.stepTitle}>{step.step_number}. {step.title}</Text>
              <Text style={styles.muted}>{step.description}</Text>
            </View>
            <Text style={[styles.badge, styles[step.status]]}>{step.status}</Text>
          </TouchableOpacity>
        ))}
        {selectedStep ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{selectedStep.title}</Text>
            <Text style={styles.bodyText}>{selectedStep.description}</Text>
            <Text style={styles.bodyText}>Practice checklist: purpose, transition, Smart Agent coaching, roleplay.</Text>
            <ActionButton label="Complete this step" onPress={() => completeStep(selectedStep.id)} />
          </View>
        ) : null}
      </>
    );
  }

  function renderAgent() {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Smart Agent</Text>
        <Text style={styles.bodyText}>Ask for coaching tied to the Blueprint. Sensitive pricing and fee requests are redirected.</Text>
        <TextInput multiline onChangeText={setAgentPrompt} style={[styles.input, styles.textArea]} value={agentPrompt} />
        <ActionButton label="Ask Agent" onPress={askAgent} />
        {agentResponse ? <Text style={styles.insight}>{agentResponse}</Text> : null}
      </View>
    );
  }

  function renderGoalSheet() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Smart GoalSheet</Text>
          <Text style={styles.inputLabel}>Sales volume</Text>
          <TextInput keyboardType="numeric" onChangeText={setGoalVolume} style={styles.input} value={goalVolume} />
          <Text style={styles.inputLabel}>Number of sales</Text>
          <TextInput keyboardType="numeric" onChangeText={setGoalSales} style={styles.input} value={goalSales} />
          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput multiline onChangeText={setGoalNotes} style={[styles.input, styles.textArea]} value={goalNotes} />
          <ActionButton label="Save GoalSheet" onPress={saveGoalSheet} />
        </View>
        <View style={styles.metrics}>
          <Metric label="Tours" value={`${goalMetrics?.qualified_tours ?? 0}`} />
          <Metric label="Sales" value={`${goalMetrics?.sales_count ?? 0}`} />
          <Metric label="Volume" value={`$${goalMetrics?.volume ?? 0}`} />
        </View>
        <Text style={styles.sectionTitle}>History</Text>
        {goalHistory.length ? goalHistory.slice(0, 6).map((entry) => (
          <View key={`${entry.date}-${entry.sales_volume}`} style={styles.row}>
            <Text style={styles.rowTitle}>{entry.date}</Text>
            <Text style={styles.muted}>{entry.number_of_sales} sale · ${entry.sales_volume}</Text>
          </View>
        )) : <EmptyState text="No GoalSheet history yet." />}
      </>
    );
  }

  function renderRoleplay() {
    const scenario = scenarios[0];
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{scenario?.title || 'Roleplay Live'}</Text>
          <Text style={styles.bodyText}>{scenario?.buyer_context || 'Practice a realistic customer scenario.'}</Text>
          <Text style={styles.bodyText}>Objective: {scenario?.objective || 'Submit for manager review.'}</Text>
          <Text style={styles.inputLabel}>Transcript</Text>
          <TextInput multiline onChangeText={setRoleplayTranscript} style={[styles.input, styles.textArea]} value={roleplayTranscript} />
          <ActionButton label="Submit for Review" onPress={submitRoleplay} />
        </View>
        <Text style={styles.sectionTitle}>Feedback</Text>
        {feedback.length ? feedback.slice(0, 6).map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.rowTitle}>{item.status}</Text>
            <Text style={styles.muted}>{item.manager_feedback?.comments || item.manager_feedback?.recommendation || 'Awaiting review'}</Text>
          </View>
        )) : <EmptyState text="No roleplay submissions yet." />}
      </>
    );
  }

  function renderResources() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resource Library</Text>
          <Text style={styles.bodyText}>Training resources are shown with server-side permission status.</Text>
        </View>
        {resources.map((resource) => (
          <View key={resource.id} style={styles.row}>
            <View style={styles.stepTextBlock}>
              <Text style={styles.rowTitle}>{resource.title}</Text>
              <Text style={styles.muted}>{resource.resource_type} · {resource.sensitivity}</Text>
            </View>
            <Text style={[styles.badge, resource.has_access ? styles.completed : styles.locked]}>{resource.has_access ? 'available' : 'restricted'}</Text>
          </View>
        ))}
      </>
    );
  }

  function renderProfile() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{user?.display_name}</Text>
          <Text style={styles.bodyText}>{user?.email}</Text>
          <Text style={styles.bodyText}>Roles: {user?.roles.join(', ')}</Text>
          <Text style={styles.bodyText}>Session status: active</Text>
          <Text style={styles.insight}>Password change, reset, invite, disable, and session invalidation are wired in the API for production-ready local auth.</Text>
          <ActionButton label="Sign out" onPress={logout} danger />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Launch readiness</Text>
          <Text style={styles.bodyText}>Secure storage, protected API calls, RBAC, resources, feedback, GoalSheet, and roleplay flows are wired for demo launch.</Text>
        </View>
      </>
    );
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, secondary, danger }: { label: string; onPress: () => void; secondary?: boolean; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.actionButton, secondary && styles.secondaryButton, danger && styles.dangerButton]} onPress={onPress}>
      <Text style={[styles.actionButtonText, secondary && styles.secondaryButtonText, danger && styles.dangerButtonText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#020506',
    flex: 1
  },
  shell: {
    flex: 1
  },
  container: {
    padding: 20,
    paddingBottom: 108
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  hero: {
    paddingVertical: 32
  },
  heroCompact: {
    paddingBottom: 18
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingTop: 12
  },
  kicker: {
    color: '#ffc21a',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8
  },
  title: {
    color: '#f8fafc',
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 42
  },
  screenTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900'
  },
  subtitle: {
    color: '#b9c0c8',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12
  },
  rolePill: {
    backgroundColor: 'rgba(255,194,26,0.14)',
    borderRadius: 999,
    color: '#ffe58a',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  notice: {
    backgroundColor: 'rgba(255,194,26,0.12)',
    borderColor: 'rgba(255,194,26,0.28)',
    borderRadius: 8,
    borderWidth: 1,
    color: '#ffe58a',
    marginBottom: 14,
    padding: 12
  },
  card: {
    backgroundColor: '#071014',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 12
  },
  bodyText: {
    color: '#dce3ea',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8
  },
  muted: {
    color: '#aeb8c2',
    fontSize: 13,
    lineHeight: 19
  },
  inputLabel: {
    color: '#dce3ea',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 4
  },
  input: {
    backgroundColor: '#0b171d',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 14,
    minHeight: 48,
    paddingHorizontal: 12
  },
  textArea: {
    minHeight: 104,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  authError: {
    backgroundColor: 'rgba(255,65,65,0.14)',
    borderColor: 'rgba(255,65,65,0.35)',
    borderRadius: 8,
    borderWidth: 1,
    color: '#ffb4b4',
    marginBottom: 14,
    padding: 12
  },
  metrics: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  metric: {
    backgroundColor: '#0b171d',
    borderRadius: 8,
    flex: 1,
    minHeight: 82,
    padding: 12
  },
  metricLabel: {
    color: '#b9c0c8',
    fontSize: 12
  },
  metricValue: {
    color: '#ffe58a',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#ffc21a',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 46,
    paddingHorizontal: 14
  },
  actionButtonText: {
    color: '#020506',
    fontWeight: '900'
  },
  disabledButton: {
    opacity: 0.62
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#ffc21a',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 46
  },
  buttonText: {
    color: '#020506',
    fontWeight: '900'
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#ffc21a',
    borderWidth: 1
  },
  secondaryButtonText: {
    color: '#ffc21a'
  },
  dangerButton: {
    backgroundColor: 'rgba(255,65,65,0.12)',
    borderColor: 'rgba(255,65,65,0.36)',
    borderWidth: 1
  },
  dangerButtonText: {
    color: '#ffb4b4'
  },
  insight: {
    backgroundColor: 'rgba(255,194,26,0.12)',
    color: '#ffe58a',
    lineHeight: 21,
    marginTop: 12,
    padding: 12
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 20
  },
  step: {
    alignItems: 'center',
    backgroundColor: '#0b171d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 68,
    padding: 14
  },
  stepSelected: {
    borderColor: 'rgba(255,194,26,0.55)'
  },
  stepTextBlock: {
    flex: 1,
    paddingRight: 8
  },
  stepTitle: {
    color: '#f8fafc',
    fontWeight: '900',
    marginBottom: 4
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#0b171d',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 58,
    padding: 14
  },
  rowTitle: {
    color: '#f8fafc',
    flex: 1,
    fontWeight: '900',
    paddingRight: 10
  },
  badge: {
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  completed: {
    backgroundColor: 'rgba(41,227,95,0.16)',
    color: '#29e35f'
  },
  current: {
    backgroundColor: 'rgba(255,194,26,0.16)',
    color: '#ffc21a'
  },
  locked: {
    backgroundColor: 'rgba(124,135,145,0.18)',
    color: '#b9c0c8'
  },
  empty: {
    backgroundColor: '#0b171d',
    borderRadius: 8,
    color: '#aeb8c2',
    padding: 14
  },
  tabBar: {
    backgroundColor: '#071014',
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 4,
    left: 0,
    paddingBottom: 12,
    paddingHorizontal: 8,
    paddingTop: 8,
    position: 'absolute',
    right: 0
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 2
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,194,26,0.14)'
  },
  tabText: {
    color: '#aeb8c2',
    fontSize: 10,
    fontWeight: '800'
  },
  tabTextActive: {
    color: '#ffe58a'
  }
});
