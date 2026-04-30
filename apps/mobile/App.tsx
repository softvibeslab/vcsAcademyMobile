import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
const SESSION_KEY = 'vcsa_token';

type Step = {
  id: string;
  step_number: number;
  title: string;
  status: string;
  progress_percent: number;
};

type Dashboard = {
  greeting: string;
  blueprint_progress: number;
  certification_status: string;
  metrics: {
    closing_percent: number;
    vpg: number;
  };
};

type Resource = {
  id: string;
  title: string;
  has_access: boolean;
};

type Submission = {
  id: string;
  status: string;
  manager_feedback?: {
    recommendation?: string;
  };
};

type Certification = {
  id: string;
  status: string;
  notes: string;
};

export default function App() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('rep@vcsa.local');
  const [password, setPassword] = useState('demo123');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [feedback, setFeedback] = useState<Submission[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [agentResponse, setAgentResponse] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  async function saveStoredToken(nextToken: string) {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(SESSION_KEY, nextToken);
      return;
    }
    await SecureStore.setItemAsync(SESSION_KEY, nextToken);
  }

  async function readStoredToken() {
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(SESSION_KEY) || '';
    }
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
    setDashboard(null);
    setSteps([]);
    setResources([]);
    setFeedback([]);
    setCertifications([]);
    setAgentResponse('');
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
      throw new Error(payload.detail || 'Request failed');
    }
    return payload.data;
  }

  async function load(sessionToken = token) {
    if (!sessionToken) return;
    const [dashboardData, stepsData, resourcesData, feedbackData, certificationData] = await Promise.all([
      api('/api/dashboard/rep', {}, sessionToken),
      api('/api/blueprint/steps', {}, sessionToken),
      api('/api/resources', {}, sessionToken),
      api('/api/roleplay/submissions/mine', {}, sessionToken),
      api('/api/certifications/mine', {}, sessionToken)
    ]);
    setDashboard(dashboardData);
    setSteps(stepsData.steps);
    setResources(resourcesData.resources);
    setFeedback(feedbackData.submissions);
    setCertifications(certificationData.decisions);
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
      load(token).catch((error) => setAgentResponse(`API error: ${error.message}`));
    }
  }, [token]);

  async function login() {
    setIsAuthenticating(true);
    setAuthError('');
    setAgentResponse('');
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
      if (token) {
        await api('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      setAgentResponse('');
    } finally {
      clearSession();
    }
  }

  async function askAgent() {
    const data = await api('/api/smart-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Help me practice Step 5', mode: 'blueprint_step' })
    });
    setAgentResponse(data.response);
  }

  async function saveGoalSheet() {
    const data = await api('/api/goalsheet', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-04-29',
        tour_outcome: 'qualified',
        sales_outcome: 'sold',
        sales_volume: 8450,
        number_of_sales: 1,
        follow_ups: [{ follow_up_date: '2026-05-01', note: 'Send approved brochure.' }],
        notes: 'Strong Step 5 transition.'
      })
    });
    setAgentResponse(data.entry.smart_agent_insight);
    await load();
  }

  async function completeNextStep() {
    const current = steps.find((step) => step.status === 'current') || steps.find((step) => step.status !== 'completed');
    if (!current) return;
    await api(`/api/blueprint/steps/${current.id}/complete`, { method: 'POST' });
    await load();
  }

  async function submitRoleplay() {
    const scenarioData = await api('/api/roleplay/scenarios');
    const scenario = scenarioData.scenarios[0];
    const sessionData = await api('/api/roleplay/sessions', {
      method: 'POST',
      body: JSON.stringify({ scenario_id: scenario.id, blueprint_step_id: scenario.blueprint_step_id })
    });
    await api(`/api/roleplay/sessions/${sessionData.session.id}/complete`, { method: 'POST' });
    await api('/api/roleplay/submissions', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionData.session.id, transcript: 'Submitted from mobile launch flow.' })
    });
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
            <Text style={styles.title}>Sign in to the Blueprint command center</Text>
            <Text style={styles.subtitle}>Access training, GoalSheet tracking, roleplay coaching, and certification progress.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Secure access</Text>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              style={styles.input}
              value={email}
            />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              autoComplete="password"
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              value={password}
            />
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
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>WL Sales Academy</Text>
          <Text style={styles.title}>Blueprint command center</Text>
          <Text style={styles.subtitle}>Train, roleplay, log performance, and get compliant Smart Agent coaching.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{dashboard?.greeting || 'Loading dashboard...'}</Text>
          <View style={styles.metrics}>
            <Metric label="Blueprint" value={`${dashboard?.blueprint_progress ?? 0}%`} />
            <Metric label="Closing" value={`${dashboard?.metrics?.closing_percent ?? 0}%`} />
            <Metric label="VPG" value={`$${dashboard?.metrics?.vpg ?? 0}`} />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={askAgent}>
              <Text style={styles.buttonText}>Ask Agent</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={saveGoalSheet}>
              <Text style={styles.secondaryButtonText}>Save GoalSheet</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={completeNextStep}>
              <Text style={styles.secondaryButtonText}>Complete Step</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={submitRoleplay}>
              <Text style={styles.secondaryButtonText}>Submit Roleplay</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Sign out</Text>
          </TouchableOpacity>
          {agentResponse ? <Text style={styles.insight}>{agentResponse}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Top Producer Roadmap</Text>
        {steps.map((step) => (
          <View key={step.id} style={styles.step}>
            <Text style={styles.stepTitle}>{step.step_number}. {step.title}</Text>
            <Text style={[styles.badge, styles[step.status as 'completed' | 'current' | 'locked']]}>{step.status}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Resources</Text>
        {resources.map((resource) => (
          <View key={resource.id} style={styles.step}>
            <Text style={styles.stepTitle}>{resource.title}</Text>
            <Text style={[styles.badge, resource.has_access ? styles.completed : styles.locked]}>{resource.has_access ? 'available' : 'restricted'}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Feedback and Certification</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>Certification: {certifications[0]?.status || dashboard?.certification_status || 'in_progress'}</Text>
          {certifications[0]?.notes ? <Text style={styles.insight}>{certifications[0].notes}</Text> : null}
          {feedback.length ? feedback.slice(0, 3).map((item) => (
            <Text key={item.id} style={styles.bodyText}>{item.status}: {item.manager_feedback?.recommendation || 'awaiting review'}</Text>
          )) : <Text style={styles.bodyText}>No roleplay feedback yet.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#020506',
    flex: 1
  },
  container: {
    padding: 20,
    paddingBottom: 48
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
  kicker: {
    color: '#ffc21a',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12
  },
  title: {
    color: '#f8fafc',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 44
  },
  subtitle: {
    color: '#b9c0c8',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14
  },
  bodyText: {
    color: '#dce3ea',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8
  },
  card: {
    backgroundColor: '#071014',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14
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
    gap: 10
  },
  metric: {
    backgroundColor: '#0b171d',
    borderRadius: 8,
    flex: 1,
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#ffc21a',
    borderRadius: 8,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center'
  },
  buttonText: {
    color: '#020506',
    fontWeight: '900'
  },
  disabledButton: {
    opacity: 0.62
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#ffc21a',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center'
  },
  secondaryButtonText: {
    color: '#ffc21a',
    fontWeight: '900'
  },
  logoutButton: {
    alignItems: 'center',
    borderColor: 'rgba(248,250,252,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 12
  },
  logoutButtonText: {
    color: '#f8fafc',
    fontWeight: '900'
  },
  insight: {
    backgroundColor: 'rgba(255,194,26,0.12)',
    color: '#ffe58a',
    marginTop: 14,
    padding: 12
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 24
  },
  step: {
    alignItems: 'center',
    backgroundColor: '#0b171d',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 58,
    padding: 14
  },
  stepTitle: {
    color: '#f8fafc',
    flex: 1,
    fontWeight: '800',
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
  }
});
