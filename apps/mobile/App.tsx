import React, { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Headphones,
  Home,
  Lock,
  Mic,
  MoreHorizontal,
  Play,
  Rocket,
  Send,
  Sparkles,
  Target,
  Users,
  Video
} from 'lucide-react-native';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';
const SESSION_KEY = 'vcsa_token';
const gold = '#ffc21a';
const gold2 = '#ffe58a';
const ink = '#020506';

type TabKey = 'home' | 'roadmap' | 'goalsheet' | 'roleplay' | 'resources' | 'support';

type User = {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
  permissions?: string[];
  team_id?: string;
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

type Metrics = {
  closing_percent: number;
  vpg: number;
  qualified_tours?: number;
  sales_count?: number;
  volume?: number;
};

type Dashboard = {
  greeting: string;
  blueprint_progress: number;
  certification_status: string;
  metrics: Metrics;
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
  sales_volume: number;
  number_of_sales: number;
};

type DemoUser = {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
  primary_role: string;
  role_label: string;
  description: string;
  password: string;
};

type ManagerDashboard = {
  team_id: string;
  summary: {
    active_reps: number;
    pending_reviews: number;
    team_metrics: Metrics;
  };
  reps: Array<{
    user: User;
    blueprint_progress: number;
    reviewed_roleplays: number;
  }>;
  pending_submissions: Submission[];
};

type AdminResource = Resource & {
  status: string;
  requires_access_grant: boolean;
};

type AuditEvent = {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  outcome: string;
  created_at: string;
};

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }> }> = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'roadmap', label: 'Roadmap', icon: Target },
  { key: 'goalsheet', label: 'GoalSheet', icon: ClipboardCheck },
  { key: 'roleplay', label: 'Roleplay Live', icon: Users },
  { key: 'resources', label: 'Resources', icon: BookOpen },
  { key: 'support', label: 'Support', icon: Headphones }
];

const blueprintAliases: Record<number, string> = {
  1: 'Meet & Greet',
  2: 'Agenda Control',
  3: 'Rapport (Breakfast / FORM)',
  4: 'Discovery / Survey',
  5: 'Remake the Pact (YES/NO TODAY)',
  6: '3-Way Pitch',
  7: 'Property Tour',
  8: 'Model Suite',
  9: 'Point of Confirmation',
  10: 'Programs',
  11: 'T.O. Pricing'
};

const fallbackDemoUsers: DemoUser[] = [
  { id: 'user_demo_visitor', email: 'visitor@vcsa.local', display_name: 'Visitor Demo', roles: ['visitor'], primary_role: 'visitor', role_label: 'Visitor', description: 'Preview basic academy access.', password: 'demo123' },
  { id: 'user_demo_rep', email: 'rep@vcsa.local', display_name: 'Chris Rivera', roles: ['sales_rep'], primary_role: 'sales_rep', role_label: 'Sales Rep', description: 'Roadmap, GoalSheet, resources and roleplay.', password: 'demo123' },
  { id: 'user_demo_trainer', email: 'trainer@vcsa.local', display_name: 'Tara Brooks', roles: ['trainer'], primary_role: 'trainer', role_label: 'Trainer', description: 'Team readiness and coaching tools.', password: 'demo123' },
  { id: 'user_demo_coach', email: 'coach@vcsa.local', display_name: 'Cole Bennett', roles: ['coach'], primary_role: 'coach', role_label: 'Coach', description: 'Roleplay coaching and feedback.', password: 'demo123' },
  { id: 'user_demo_manager', email: 'manager@vcsa.local', display_name: 'Maya Torres', roles: ['manager'], primary_role: 'manager', role_label: 'Manager', description: 'Team dashboard and certifications.', password: 'demo123' },
  { id: 'user_demo_to_manager', email: 'to-manager@vcsa.local', display_name: 'Theo Owens', roles: ['to_manager'], primary_role: 'to_manager', role_label: 'T.O. Manager', description: 'T.O. workflows and pricing resources.', password: 'demo123' },
  { id: 'user_demo_admin', email: 'admin@vcsa.local', display_name: 'Admin Demo', roles: ['admin'], primary_role: 'admin', role_label: 'Admin', description: 'Users, resources and audit visibility.', password: 'demo123' }
];

const leadershipRoles = new Set(['manager', 'to_manager', 'trainer', 'coach', 'admin']);

function hasAnyRole(user: User | null, roles: string[]) {
  return Boolean(user?.roles.some((role) => roles.includes(role)));
}

function roleLabel(role: string) {
  return role
    .replace('sales_rep', 'Sales Rep')
    .replace('to_manager', 'T.O. Manager')
    .replace(/^./, (value) => value.toUpperCase());
}

function formatCurrency(value?: number | string) {
  const amount = Number(value) || 0;
  return `$${amount.toLocaleString('en-US')}`;
}

export default function App() {
  const [token, setToken] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>(fallbackDemoUsers);
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
  const [goalMetrics, setGoalMetrics] = useState<Metrics | null>(null);
  const [managerDashboard, setManagerDashboard] = useState<ManagerDashboard | null>(null);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminResources, setAdminResources] = useState<AdminResource[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedStepId, setSelectedStepId] = useState('step_5');
  const [showStepDetail, setShowStepDetail] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState('Help me practice Step 5');
  const [agentResponse, setAgentResponse] = useState('');
  const [goalVolume, setGoalVolume] = useState('8450');
  const [goalSales, setGoalSales] = useState('1');
  const [goalNotes, setGoalNotes] = useState('');
  const [roleplayTranscript, setRoleplayTranscript] = useState('Practice transcript with a clear Step 5 commitment check.');
  const [authError, setAuthError] = useState('');
  const [screenMessage, setScreenMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const completedCount = useMemo(() => steps.filter((step) => step.status === 'completed').length, [steps]);
  const selectedStep = steps.find((step) => step.id === selectedStepId) || steps.find((step) => step.step_number === 5) || steps[0];
  const currentStep = steps.find((step) => step.status === 'current') || steps.find((step) => step.status !== 'completed') || steps[0];
  const firstName = user?.display_name?.split(' ')[0] || 'Chris';
  const roadmapPercent = Math.max(dashboard?.blueprint_progress ?? 0, completedCount ? Math.round((completedCount / 11) * 100) : 0);
  const canUseLeadershipWorkspace = hasAnyRole(user, Array.from(leadershipRoles));
  const canUseAdminWorkspace = hasAnyRole(user, ['admin']);
  const selectedDemoUser = demoUsers.find((demoUser) => demoUser.email === email);

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
    setManagerDashboard(null);
    setAdminUsers([]);
    setAdminResources([]);
    setAuditEvents([]);
    setAgentResponse('');
    setScreenMessage('');
    setActiveTab('home');
    setShowStepDetail(false);
    setShowLogin(false);
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
      if (!stepsData.steps.find((step: Step) => step.id === selectedStepId)) setSelectedStepId(stepsData.steps[4]?.id || stepsData.steps[0]?.id || 'step_5');
      const roles = meData.user.roles || [];
      if (roles.some((role: string) => leadershipRoles.has(role))) {
        const managerData = await api('/api/manager/team-dashboard', {}, sessionToken);
        setManagerDashboard(managerData);
      } else {
        setManagerDashboard(null);
      }
      if (roles.includes('admin')) {
        const [usersData, resourcesData, auditData] = await Promise.all([
          api('/api/admin/users', {}, sessionToken),
          api('/api/admin/resources', {}, sessionToken),
          api('/api/admin/audit-events', {}, sessionToken)
        ]);
        setAdminUsers(usersData.users);
        setAdminResources(resourcesData.resources);
        setAuditEvents(auditData.events);
      } else {
        setAdminUsers([]);
        setAdminResources([]);
        setAuditEvents([]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/demo-users`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.data?.users?.length) setDemoUsers(payload.data.users);
      })
      .catch(() => setDemoUsers(fallbackDemoUsers));
    readStoredToken()
      .then((storedToken) => {
        if (storedToken) setToken(storedToken);
      })
      .finally(() => setIsRestoringSession(false));
  }, []);

  useEffect(() => {
    if (token) load(token).catch((error) => setScreenMessage(`API error: ${error.message}`));
  }, [token]);

  useEffect(() => {
    if (activeTab !== 'roadmap') setShowStepDetail(false);
  }, [activeTab]);

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
      setShowLogin(true);
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

  function selectDemoUser(demoUser: DemoUser) {
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setAuthError('');
  }

  async function askAgent(message = agentPrompt) {
    const data = await api('/api/smart-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, mode: 'blueprint_step' })
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
        follow_ups: [
          { follow_up_date: '2026-05-18', note: 'Send brochure and pricing details' },
          { follow_up_date: '2026-05-21', note: 'Check availability and offer' },
          { follow_up_date: '2026-05-24', note: 'Final follow up / close attempt' }
        ],
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

  if (isRestoringSession) return <CenteredStatus text="Restoring secure session..." />;

  if (!token) return showLogin ? renderLogin() : renderWelcome();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {activeTab === 'home' && <LoggedInHeader />}
          {screenMessage ? <Notice text={screenMessage} /> : null}
          {isLoading ? <Text style={styles.muted}>Syncing workspace...</Text> : null}
          {activeTab === 'home' && renderHome()}
          {activeTab === 'roadmap' && renderRoadmap()}
          {activeTab === 'goalsheet' && renderGoalSheet()}
          {activeTab === 'roleplay' && renderRoleplay()}
          {activeTab === 'resources' && renderResources()}
          {activeTab === 'support' && renderSupport()}
        </ScrollView>
        <BottomNav activeTab={activeTab} onSelect={setActiveTab} />
      </View>
    </SafeAreaView>
  );

  function renderWelcome() {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#03080b', '#010202']} style={styles.welcome}>
          <View style={styles.statusSpacer} />
          <BrandMark stacked />
          <View style={styles.agentHaloLarge}>
            <View style={styles.orbitOuter} />
            <View style={styles.orbitMiddle} />
            <View style={styles.orbitCore}>
              <Bot color={gold2} size={64} strokeWidth={1.6} />
            </View>
            <FeatureCallout label="Analyze" caption="Every Conversation" style={styles.calloutLeftTop} icon={BarChart3} />
            <FeatureCallout label="Guide" caption="Every Step" style={styles.calloutRightTop} icon={Rocket} />
            <FeatureCallout label="Coach" caption="In Real-Time" style={styles.calloutLeftBottom} icon={Bot} />
            <FeatureCallout label="Elevate" caption="Every Result" style={styles.calloutRightBottom} icon={Target} />
          </View>
          <Text style={styles.welcomeEyebrow}>AI-POWERED SALES INTELLIGENCE</Text>
          <Text style={styles.welcomeTitle}>SMART AGENT</Text>
          <Text style={styles.welcomeCopy}>Your AI-powered partner that listens, analyzes, and coaches you to close more deals.</Text>
          <View style={styles.featureGrid}>
            <MiniFeature icon={Bot} title="AI Analysis" copy="Deep insights from every interaction." />
            <MiniFeature icon={Users} title="Real-Time Coaching" copy="Personalized guidance when you need it." />
            <MiniFeature icon={BarChart3} title="Performance Boost" copy="Track progress and close at a higher level." />
          </View>
          <View style={styles.coachCard}>
            <View>
              <Text style={styles.goldCaps}>YOUR AI COACH</Text>
              <Text style={styles.coachTitle}>Smart Agent</Text>
              <Text style={styles.bodyText}>Always with you. Always leveling you up.</Text>
            </View>
            <View style={styles.eyeBadge}>
              <Bot color={gold2} size={36} />
            </View>
          </View>
          <GoldButton label="Get Started" onPress={() => setShowLogin(true)} icon={ChevronRight} />
          <TouchableOpacity onPress={() => setShowLogin(true)}>
            <Text style={styles.accountLink}>I already have an account</Text>
          </TouchableOpacity>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  function renderLogin() {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.backLink} onPress={() => setShowLogin(false)}>
            <ChevronLeft color={gold} size={24} />
            <Text style={styles.goldText}>Back</Text>
          </TouchableOpacity>
          <BrandMark />
          <View style={styles.agentEyeHero}>
            <Bot color={gold2} size={76} strokeWidth={1.4} />
          </View>
          <Text style={styles.title}>Welcome to Sales <Text style={styles.goldText}>Academy</Text></Text>
          <Text style={styles.subtitle}>Your AI-powered partner to train, practice and master every step of the sales process.</Text>
          <GlassCard accent>
            <View style={styles.rowBetween}>
              <View style={styles.stepTextBlock}>
                <Text style={styles.cardTitle}>Demo role access</Text>
                <Text style={styles.muted}>Choose a role to enter its workspace. All demo profiles use password demo123.</Text>
              </View>
              <Lock color={gold} size={27} />
            </View>
            <View style={styles.demoGrid}>
              {demoUsers.map((demoUser) => (
                <TouchableOpacity
                  key={demoUser.id}
                  style={[styles.demoRoleCard, selectedDemoUser?.id === demoUser.id && styles.demoRoleCardActive]}
                  onPress={() => selectDemoUser(demoUser)}
                >
                  <Text style={[styles.demoRoleTitle, selectedDemoUser?.id === demoUser.id && styles.goldText]}>{demoUser.role_label}</Text>
                  <Text style={styles.demoRoleEmail}>{demoUser.email}</Text>
                  <Text style={styles.demoRoleCopy}>{demoUser.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
          <GlassCard>
            <Text style={styles.cardTitle}>Secure access</Text>
            {selectedDemoUser ? <Text style={styles.roleHint}>Selected: {selectedDemoUser.role_label} workspace</Text> : null}
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="rep@vcsa.local" placeholderTextColor="#6f7780" style={styles.input} value={email} />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput autoComplete="password" onChangeText={setPassword} placeholder="demo123" placeholderTextColor="#6f7780" secureTextEntry style={styles.input} value={password} />
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            <GoldButton label={isAuthenticating ? 'Signing in...' : 'Enter Sales Academy'} onPress={login} icon={Rocket} disabled={isAuthenticating} />
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  function renderHome() {
    return (
      <>
        <Text style={styles.homeTitle}>Good morning, <Text style={styles.goldText}>{firstName}</Text></Text>
        <Text style={styles.subtitle}>Your Smart Agent is ready to provide valuable resources.</Text>
        <View style={styles.roleChipRow}>
          {(user?.roles || []).map((role) => (
            <Text key={role} style={styles.roleChip}>{roleLabel(role)}</Text>
          ))}
        </View>
        {(canUseLeadershipWorkspace || canUseAdminWorkspace) ? (
          <GlassCard accent>
            <View style={styles.rowBetween}>
              <View style={styles.stepTextBlock}>
                <Text style={styles.goldCaps}>ROLE WORKSPACE</Text>
                <Text style={styles.cardTitle}>{canUseAdminWorkspace ? 'Admin Control Center' : 'Leadership Dashboard'}</Text>
                <Text style={styles.bodyText}>
                  {canUseAdminWorkspace
                    ? `${adminUsers.length || 0} users, ${adminResources.length || 0} resources and ${auditEvents.length || 0} audit events available.`
                    : `${managerDashboard?.summary.active_reps || 0} reps and ${managerDashboard?.summary.pending_reviews || 0} pending reviews in your team.`}
                </Text>
              </View>
              <TouchableOpacity style={styles.smallGoldAction} onPress={() => setActiveTab('support')}>
                <Users color={ink} size={20} />
                <Text style={styles.smallGoldActionText}>Open</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : null}
        <GlassCard accent>
          <View style={styles.smartAgentCard}>
            <Pill label="SMART AGENT" icon={Sparkles} />
            <View style={styles.agentEyeHero}>
              <Bot color={gold2} size={76} strokeWidth={1.4} />
            </View>
            <Text style={styles.centerTitle}>Your Smart Agent</Text>
            <Text style={styles.centerCopy}>Ask anything. Get real-time guidance.</Text>
            <View style={styles.promptBar}>
              <TextInput onChangeText={setAgentPrompt} placeholder="Ask your agent anything..." placeholderTextColor="#aeb8c2" style={styles.promptInput} value={agentPrompt} />
              <TouchableOpacity style={styles.sendButton} onPress={() => askAgent()}>
                <Send color={ink} size={22} />
              </TouchableOpacity>
            </View>
            <View style={styles.quickChips}>
              <Chip label="Objection handling" icon={Bot} onPress={() => askAgent('Help me with objection handling')} />
              <Chip label="Deal strategy" icon={Target} onPress={() => askAgent('Give me a deal strategy for today')} />
            </View>
            {agentResponse ? <Text style={styles.insight}>{agentResponse}</Text> : null}
          </View>
        </GlassCard>
        <GlassCard accent>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Today's Progress</Text>
            <Text style={styles.goldText}>View Insights</Text>
          </View>
          <View style={styles.progressGrid}>
            <ProgressTile icon={Target} label="Goal Progress" value={`${roadmapPercent}%`} trend="On track" />
            <ProgressTile icon={ClipboardCheck} label="Closing %" value={`${dashboard?.metrics?.closing_percent ?? 0}%`} trend="+6%" />
            <ProgressTile icon={Bot} label="VPG" value={formatCurrency(dashboard?.metrics?.vpg ?? 0)} trend="+12%" />
            <ProgressTile icon={BarChart3} label="Sales Volume" value={formatCurrency(goalMetrics?.volume ?? 8450)} trend="+15%" />
          </View>
        </GlassCard>
        <GlassCard accent>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Quick Access</Text>
            <Text style={styles.goldText}>View all</Text>
          </View>
          <View style={styles.quickAccessGrid}>
            <QuickAccess label="TPR" caption="Top Producer Roadmap" icon={Target} tab="roadmap" />
            <QuickAccess label="Goal" caption="Smart GoalSheet" icon={ClipboardCheck} tab="goalsheet" />
            <QuickAccess label="Roleplay" caption="Roleplay Live" icon={Users} tab="roleplay" />
            <QuickAccess label="Resources" caption="Resources" icon={BookOpen} tab="resources" />
            <QuickAccess label="Support" caption="Support Contact" icon={Headphones} tab="support" />
            <QuickAccess label="Access" caption="All Access" icon={Lock} tab="support" />
          </View>
        </GlassCard>
      </>
    );
  }

  function renderRoadmap() {
    if (selectedStep && showStepDetail) {
      return renderStepDetail();
    }
    return (
      <>
        <View style={styles.titleBar}>
          <Text style={styles.screenTitle}>Top Producer Roadmap</Text>
          <HelpPill />
        </View>
        <Text style={styles.subtitle}>Master the blueprint. Execute the perfect sale.</Text>
        <GlassCard>
          <View style={styles.stageCard}>
            <ProgressRing percent={roadmapPercent} />
            <View style={styles.stageCopy}>
              <Text style={styles.goldCaps}>CURRENT STAGE</Text>
              <Text style={styles.cardTitle}>{currentStep?.step_number || 4}. {blueprintAliases[currentStep?.step_number || 4] || currentStep?.title}</Text>
              <Text style={styles.bodyText}>{currentStep?.description || 'Keep building elite habits.'}</Text>
              <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(100, roadmapPercent)}%` }]} /></View>
              <Text style={styles.bodyText}>{completedCount} of 11 steps completed</Text>
            </View>
          </View>
        </GlassCard>
        <Text style={styles.sectionTitle}>YOUR 11-STEP BLUEPRINT</Text>
        {steps.map((step) => (
          <TouchableOpacity
            key={step.id}
            style={[styles.roadmapRow, step.status === 'current' && styles.roadmapRowActive]}
            onPress={() => {
              setSelectedStepId(step.id);
              setShowStepDetail(true);
            }}
          >
            <View style={[styles.stepIconCircle, step.status === 'completed' && styles.stepDone]}>
              {step.status === 'completed' ? <Check color={ink} size={24} /> : <Text style={styles.stepIconText}>{step.step_number}</Text>}
            </View>
            <View style={styles.stepTextBlock}>
              <Text style={styles.rowTitle}>{step.step_number}. {blueprintAliases[step.step_number] || step.title}</Text>
              <Text style={styles.muted}>{step.description}</Text>
            </View>
            {step.status === 'current' ? <GoldSmallButton label="Continue" /> : <Text style={[styles.badge, step.status === 'completed' ? styles.completed : styles.locked]}>{step.status === 'completed' ? 'Completed' : `${step.progress_percent}%`}</Text>}
          </TouchableOpacity>
        ))}
        <GlassCard accent>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.goldCaps}>TODAY'S FOCUS</Text>
              <Text style={styles.cardTitle}>Complete your {currentStep?.title || 'Discovery / Survey'}</Text>
              <Text style={styles.bodyText}>Ask great questions and uncover their true vacation style.</Text>
            </View>
            <TouchableOpacity style={styles.smallGoldAction} onPress={() => completeStep(currentStep?.id)}>
              <Rocket color={ink} size={20} />
              <Text style={styles.smallGoldActionText}>Start Now</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </>
    );
  }

  function renderStepDetail() {
    const step = selectedStep;
    return (
      <>
        <TouchableOpacity style={styles.backLink} onPress={() => setShowStepDetail(false)}>
          <ChevronLeft color={gold} size={24} />
          <Text style={styles.goldText}>Back to Roadmap</Text>
        </TouchableOpacity>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.goldCaps}>STEP {step?.step_number || 5} OF 11</Text>
            <Text style={styles.stepDetailTitle}>Remake the Pact{'\n'}<Text style={styles.goldText}>(YES / NO TODAY)</Text></Text>
          </View>
          <HelpPill />
        </View>
        <Pill label="High Impact Step" icon={Sparkles} />
        <GlassCard>
          <SectionLabel icon={Video} label="WATCH" />
          <Text style={styles.cardTitle}>How Top Producers Do It</Text>
          <View style={styles.videoMock}>
            <View style={styles.playCircle}><Play color="#fff" size={42} fill="#fff" /></View>
            <Text style={styles.videoTime}>7:24</Text>
          </View>
        </GlassCard>
        <GlassCard>
          <SectionLabel icon={FileText} label="SCRIPT" />
          <Text style={styles.cardTitle}>Exact Words That Close</Text>
          <View style={styles.quoteBox}>
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.quoteText}>If you like what you see, it makes sense, and if it is 100% affordable, would you feel comfortable giving me a simple <Text style={styles.goldText}>YES today?</Text></Text>
          </View>
          <Text style={styles.centerLink}>View Full Script</Text>
        </GlassCard>
        <GlassCard>
          <SectionLabel icon={Headphones} label="AUDIO" />
          <Text style={styles.cardTitle}>Master the Delivery</Text>
          <View style={styles.audioBar}>
            <TouchableOpacity style={styles.audioPlay}><Play color={ink} size={24} fill={ink} /></TouchableOpacity>
            <Text style={styles.waveform}>|||||||||||||||||||||||||||||</Text>
            <Text style={styles.bodyText}>5:12</Text>
          </View>
        </GlassCard>
        <Text style={styles.bodyText}>Use <Text style={styles.goldText}>after discovery</Text>, before showing pricing.</Text>
        <GoldButton label="Run Step" onPress={() => setActiveTab('roleplay')} icon={Rocket} />
      </>
    );
  }

  function renderGoalSheet() {
    return (
      <>
        <HeaderLine title="Smart GoalSheet" subtitle="Log your day. Your Agent turns data into results." />
        <View style={styles.goalHeaderActions}>
          <TouchableOpacity style={styles.dateButton}>
            <CalendarDays color={gold} size={18} />
            <Text style={styles.goldText}>Today, May 16, 2025</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyButton}>
            <BarChart3 color={gold} size={18} />
            <Text style={styles.goldText}>View History</Text>
          </TouchableOpacity>
        </View>
        <GoalSection number="1" title="TOUR" icon={Target} subtitle="What type of guest did you take today?">
          <View style={styles.optionGrid}>
            {['Q\nQualified', 'CT\nClose Today', 'NQ\nNot Qualified', 'No Tour\nDidn’t take any'].map((item, index) => (
              <OptionCard key={item} selected={index === 1 || index === 0} text={item} />
            ))}
          </View>
        </GoalSection>
        <GoalSection number="2" title="SALES" icon={BarChart3} subtitle="Did you close any sales today?">
          <View style={styles.twoCol}>
            <OptionCard selected text="Yes, I Sold\nRecord your volume" />
            <OptionCard text="No, I Didn’t Sell\nTell us why" />
          </View>
          <View style={styles.twoCol}>
            <InputBlock label="Sales Volume (USD)" value={formatCurrency(goalVolume)} onChangeText={(value) => setGoalVolume(value.replace(/[^0-9]/g, ''))} />
            <InputBlock label="# of Sales" value={goalSales} onChangeText={setGoalSales} />
          </View>
        </GoalSection>
        <GoalSection number="3" title="IF NO SALE, WHY?" icon={CircleHelp} subtitle="Select the main reason">
          <View style={styles.selectMock}><Text style={styles.bodyText}>Price was too high</Text><ChevronRight color="#fff" size={18} /></View>
        </GoalSection>
        <GoalSection number="4" title="YOUR METRICS" icon={BarChart3} subtitle="Track your key performance metrics">
          <View style={styles.metricCards}>
            <GoalMetric label="Closing %" value={`${dashboard?.metrics?.closing_percent ?? 28}%`} goal="/ 40% goal" trend="↓ 12% vs yesterday" />
            <GoalMetric label="VPG" value={formatCurrency(dashboard?.metrics?.vpg ?? 8450)} goal="/ $10,000 goal" trend="↓ $1,550 vs yesterday" />
            <GoalMetric label="Volume" value={formatCurrency(goalMetrics?.volume ?? 8450)} goal="/ $15,000 goal" trend="↑ $2,450 vs yesterday" good />
          </View>
        </GoalSection>
        <GoalSection number="5" title="FOLLOW UP REMINDER" icon={CalendarDays} subtitle="Plan your follow ups">
          {['May 18, 2025 · Send brochure and pricing details', 'May 21, 2025 · Check availability and offer', 'May 24, 2025 · Final follow up / Close attempt'].map((line, index) => (
            <View style={styles.followRow} key={line}>
              <Text style={styles.goldText}>#{index + 1}</Text>
              <Text style={styles.bodyText}>{line}</Text>
            </View>
          ))}
        </GoalSection>
        <GoalSection number="6" title="ANYTHING ELSE?" icon={FileText} subtitle="Add a quick note about your day">
          <TextInput multiline onChangeText={setGoalNotes} placeholder="Add a quick note (optional)..." placeholderTextColor="#6f7780" style={[styles.input, styles.noteInput]} value={goalNotes} />
        </GoalSection>
        <TouchableOpacity style={styles.agentInsight} onPress={() => askAgent('Analyze my GoalSheet performance')}>
          <Sparkles color={gold} size={36} />
          <View style={styles.stepTextBlock}>
            <Text style={styles.goldCaps}>SMART AGENT INSIGHT</Text>
            <Text style={styles.bodyText}>Great job closing 1 deal. Focus on <Text style={styles.goldText}>handling more objections</Text> to increase your closing %.</Text>
          </View>
          <ChevronRight color={gold} size={24} />
        </TouchableOpacity>
        <GoldButton label="Save My Entry" onPress={saveGoalSheet} icon={ClipboardCheck} />
      </>
    );
  }

  function renderRoleplay() {
    const scenario = scenarios[0];
    return (
      <>
        <View style={styles.roleplayHeader}>
          <View style={styles.rowCenter}>
            <ChevronLeft color={gold} size={26} />
            <BrandCompact />
          </View>
          <View style={styles.roleplayTitleBlock}>
            <Text style={styles.cardTitle}>Roleplay Live</Text>
            <Text style={styles.liveText}>● Live</Text>
          </View>
          <TouchableOpacity style={styles.endButton}><Text style={styles.endText}>End</Text></TouchableOpacity>
        </View>
        <GlassCard>
          <View style={styles.roleplayStats}>
            <StatBlock icon={Target} label="Scenario" value={scenario?.title || 'Objection Handling'} caption="Step 4: Remake the Pact" />
            <StatBlock icon={CalendarDays} label="Time Elapsed" value="08:42" />
            <StatBlock icon={Mic} label="Your Role" value="Agent" caption="Speaking Now" green />
          </View>
        </GlassCard>
        <View style={styles.videoPanels}>
          <ParticipantCard label="Coach" />
          <ParticipantCard label="You (Rep)" speaking />
        </View>
        <GlassCard>
          <View style={styles.controlRow}>
            <ControlButton icon={Mic} label="Mute" />
            <ControlButton icon={Video} label="Stop Video" />
            <ControlButton icon={Send} label="Share Screen" active />
            <ControlButton icon={Bot} label="Chat" />
            <ControlButton icon={MoreHorizontal} label="More" />
          </View>
        </GlassCard>
        <View style={styles.tipCard}>
          <Sparkles color={gold} size={28} />
          <Text style={styles.tipText}><Text style={styles.goldText}>Tip:</Text> Listen carefully, address the real concern and guide the buyer to a decision.</Text>
        </View>
        <TextInput multiline onChangeText={setRoleplayTranscript} placeholder="Roleplay transcript..." placeholderTextColor="#6f7780" style={[styles.input, styles.textArea]} value={roleplayTranscript} />
        <GoldButton label="Submit for Review" onPress={submitRoleplay} icon={Send} />
      </>
    );
  }

  function renderResources() {
    return (
      <>
        <HeaderLine title="Resources" subtitle="Approved training, scripts, checklists and sensitive-access content." />
        {resources.map((resource) => (
          <GlassCard key={resource.id}>
            <View style={styles.rowBetween}>
              <View style={styles.stepTextBlock}>
                <Text style={styles.cardTitle}>{resource.title}</Text>
                <Text style={styles.muted}>{resource.resource_type} · {resource.sensitivity}</Text>
              </View>
              <Text style={[styles.badge, resource.has_access ? styles.completed : styles.locked]}>{resource.has_access ? 'available' : 'restricted'}</Text>
            </View>
          </GlassCard>
        ))}
      </>
    );
  }

  function renderLeadershipWorkspace() {
    if (!canUseLeadershipWorkspace) return null;
    return (
      <GlassCard accent>
        <Text style={styles.goldCaps}>LEADERSHIP WORKSPACE</Text>
        <Text style={styles.cardTitle}>Team Coaching Manager</Text>
        <View style={styles.roleStatsGrid}>
          <RoleStat label="Active reps" value={`${managerDashboard?.summary.active_reps || 0}`} />
          <RoleStat label="Pending reviews" value={`${managerDashboard?.summary.pending_reviews || 0}`} />
          <RoleStat label="Team VPG" value={formatCurrency(managerDashboard?.summary.team_metrics?.vpg || 0)} />
        </View>
        {managerDashboard?.reps.slice(0, 4).map((rep) => (
          <View style={styles.roleListRow} key={rep.user.id}>
            <View style={styles.stepTextBlock}>
              <Text style={styles.rowTitle}>{rep.user.display_name}</Text>
              <Text style={styles.muted}>{rep.blueprint_progress}% roadmap · {rep.reviewed_roleplays} reviewed roleplays</Text>
            </View>
            <Text style={[styles.badge, styles.completed]}>team</Text>
          </View>
        ))}
        {managerDashboard?.pending_submissions.slice(0, 3).map((submission) => (
          <View style={styles.roleListRow} key={submission.id}>
            <View style={styles.stepTextBlock}>
              <Text style={styles.rowTitle}>Pending Review</Text>
              <Text style={styles.muted}>{submission.id} · {submission.status}</Text>
            </View>
            <Text style={[styles.badge, styles.locked]}>review</Text>
          </View>
        ))}
      </GlassCard>
    );
  }

  function renderAdminWorkspace() {
    if (!canUseAdminWorkspace) return null;
    return (
      <GlassCard accent>
        <Text style={styles.goldCaps}>ADMIN WORKSPACE</Text>
        <Text style={styles.cardTitle}>Users, Resources & Audit</Text>
        <View style={styles.roleStatsGrid}>
          <RoleStat label="Users" value={`${adminUsers.length}`} />
          <RoleStat label="Resources" value={`${adminResources.length}`} />
          <RoleStat label="Audit events" value={`${auditEvents.length}`} />
        </View>
        {adminUsers.slice(0, 5).map((item) => (
          <View style={styles.roleListRow} key={item.id}>
            <View style={styles.stepTextBlock}>
              <Text style={styles.rowTitle}>{item.display_name}</Text>
              <Text style={styles.muted}>{item.email} · {item.roles.map(roleLabel).join(', ')}</Text>
            </View>
            <Text style={[styles.badge, item.status === 'active' ? styles.completed : styles.locked]}>{item.status}</Text>
          </View>
        ))}
        {auditEvents.slice(0, 3).map((event) => (
          <View style={styles.roleListRow} key={event.id}>
            <View style={styles.stepTextBlock}>
              <Text style={styles.rowTitle}>{event.action}</Text>
              <Text style={styles.muted}>{event.outcome} · {event.target_type}:{event.target_id}</Text>
            </View>
          </View>
        ))}
      </GlassCard>
    );
  }

  function renderSupport() {
    return (
      <>
        <HeaderLine title="Support" subtitle="Access, profile, certification and launch readiness." />
        {renderLeadershipWorkspace()}
        {renderAdminWorkspace()}
        <GlassCard>
          <Text style={styles.cardTitle}>{user?.display_name}</Text>
          <Text style={styles.bodyText}>{user?.email}</Text>
          <Text style={styles.bodyText}>Roles: {user?.roles.join(', ')}</Text>
          <Text style={styles.bodyText}>Certification: {certifications[0]?.status || dashboard?.certification_status || 'in_progress'}</Text>
          <Text style={styles.insight}>Auth, RBAC, Smart Agent, GoalSheet, Roleplay, Resources and Manager/Admin APIs are wired for launch-demo validation.</Text>
          <TouchableOpacity style={styles.secondaryAction} onPress={logout}><Text style={styles.secondaryActionText}>Sign out</Text></TouchableOpacity>
        </GlassCard>
        {feedback.length ? feedback.slice(0, 4).map((item) => (
          <GlassCard key={item.id}>
            <Text style={styles.cardTitle}>Roleplay Feedback</Text>
            <Text style={styles.bodyText}>{item.status}: {item.manager_feedback?.comments || item.manager_feedback?.recommendation || 'Awaiting review'}</Text>
          </GlassCard>
        )) : null}
      </>
    );
  }

  function QuickAccess({ label, caption, icon: Icon, tab }: { label: string; caption: string; icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; tab: TabKey }) {
    return (
      <TouchableOpacity style={styles.quickAccessItem} onPress={() => setActiveTab(tab)}>
        <Icon color={gold} size={31} strokeWidth={1.7} />
        <Text style={styles.quickAccessLabel}>{label}</Text>
        <Text style={styles.quickAccessCaption}>{caption}</Text>
      </TouchableOpacity>
    );
  }
}

function CenteredStatus({ text }: { text: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centered}>
        <BrandMark />
        <Text style={styles.subtitle}>{text}</Text>
      </View>
    </SafeAreaView>
  );
}

function LoggedInHeader() {
  return (
    <View style={styles.loggedHeader}>
      <BrandCompact />
      <View style={styles.headerActions}>
        <Bell color="#fff" size={26} />
        <View style={styles.avatar}><Text style={styles.avatarText}>AB</Text></View>
      </View>
    </View>
  );
}

function BrandMark({ stacked }: { stacked?: boolean }) {
  return (
    <View style={stacked ? styles.brandStacked : styles.brand}>
      <Text style={styles.logoText}>WL</Text>
      <View style={styles.brandDivider} />
      <Text style={styles.brandLabel}>SALES ACADEMY</Text>
    </View>
  );
}

function BrandCompact() {
  return (
    <View style={styles.brandCompact}>
      <Text style={styles.logoTextSmall}>WL</Text>
      <View style={styles.brandDividerSmall} />
      <Text style={styles.brandLabelSmall}>SALES ACADEMY</Text>
    </View>
  );
}

function GlassCard({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <LinearGradient colors={accent ? ['rgba(10,22,28,0.95)', 'rgba(3,8,10,0.96)'] : ['rgba(12,19,24,0.94)', 'rgba(3,8,10,0.94)']} style={[styles.card, accent && styles.cardAccent]}>
      {children}
    </LinearGradient>
  );
}

function GoldButton({ label, onPress, icon: Icon, disabled }: { label: string; onPress: () => void; icon?: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; disabled?: boolean }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.goldButton, disabled && styles.disabledButton]}>
      {Icon ? <Icon color={ink} size={27} strokeWidth={2.2} /> : null}
      <Text style={styles.goldButtonText}>{label}</Text>
      <ChevronRight color={ink} size={28} />
    </TouchableOpacity>
  );
}

function Pill({ label, icon: Icon }: { label: string; icon?: React.ComponentType<{ color: string; size: number; strokeWidth?: number }> }) {
  return (
    <View style={styles.pill}>
      {Icon ? <Icon color={gold} size={18} /> : null}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function FeatureCallout({ label, caption, icon: Icon, style }: { label: string; caption: string; icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; style: object }) {
  return (
    <View style={[styles.featureCallout, style]}>
      <Icon color={gold} size={24} />
      <View>
        <Text style={styles.calloutLabel}>{label}</Text>
        <Text style={styles.calloutCaption}>{caption}</Text>
      </View>
    </View>
  );
}

function MiniFeature({ icon: Icon, title, copy }: { icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; title: string; copy: string }) {
  return (
    <View style={styles.miniFeature}>
      <View style={styles.iconRing}><Icon color={gold} size={28} /></View>
      <Text style={styles.miniFeatureTitle}>{title}</Text>
      <Text style={styles.miniFeatureCopy}>{copy}</Text>
    </View>
  );
}

function Notice({ text }: { text: string }) {
  return <Text style={styles.notice}>{text}</Text>;
}

function ProgressRing({ percent }: { percent: number }) {
  return (
    <View style={styles.progressRing}>
      <Text style={styles.progressPercent}>{percent}%</Text>
      <Text style={styles.progressLabel}>ROADMAP{'\n'}COMPLETE</Text>
    </View>
  );
}

function GoldSmallButton({ label }: { label: string }) {
  return <Text style={styles.goldSmallButton}>{label}</Text>;
}

function HeaderLine({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.eyeSmall}><Bot color={gold2} size={40} /></View>
    </View>
  );
}

function GoalSection({ number, title, subtitle, icon: Icon, children }: { number: string; title: string; subtitle: string; icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; children: React.ReactNode }) {
  return (
    <GlassCard>
      <View style={styles.goalSectionHeader}>
        <View style={styles.goalIcon}><Icon color={gold} size={22} /></View>
        <View>
          <Text style={styles.goalSectionTitle}>{number}. {title}</Text>
          <Text style={styles.muted}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </GlassCard>
  );
}

function OptionCard({ text, selected }: { text: string; selected?: boolean }) {
  const [lead, ...rest] = text.split(/\\n|\n/);
  return (
    <View style={[styles.optionCard, selected && styles.optionSelected]}>
      <Text style={[styles.optionLead, selected && styles.goldText]}>{lead}</Text>
      {rest.length ? <Text style={styles.muted}>{rest.join(' ')}</Text> : null}
      {selected ? <View style={styles.optionCheck}><Check color={ink} size={14} /></View> : <View style={styles.optionEmpty} />}
    </View>
  );
}

function InputBlock({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput onChangeText={onChangeText} placeholderTextColor="#6f7780" style={styles.input} value={value} />
    </View>
  );
}

function GoalMetric({ label, value, goal, trend, good }: { label: string; value: string; goal: string; trend: string; good?: boolean }) {
  return (
    <View style={styles.goalMetric}>
      <Text style={styles.bodyText}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.metricBig}>{value}</Text>
      <Text style={styles.muted}>{goal}</Text>
      <View style={styles.progressBar}><View style={styles.progressFill} /></View>
      <Text style={good ? styles.goodTrend : styles.badTrend}>{trend}</Text>
    </View>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; label: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Icon color={gold} size={22} />
      <Text style={styles.goldCaps}>{label}</Text>
    </View>
  );
}

function StatBlock({ icon: Icon, label, value, caption, green }: { icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; label: string; value: string; caption?: string; green?: boolean }) {
  return (
    <View style={styles.statBlock}>
      <Icon color={green ? '#29e35f' : gold} size={28} />
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.statValue, green && styles.greenText]}>{value}</Text>
      {caption ? <Text style={[styles.muted, green && styles.greenText]}>{caption}</Text> : null}
    </View>
  );
}

function ParticipantCard({ label, speaking }: { label: string; speaking?: boolean }) {
  return (
    <View style={styles.participantCard}>
      <Text style={styles.participantLabel}>{label}</Text>
      {speaking ? <View style={styles.speakingBadge}><BarChart3 color="#29e35f" size={24} /></View> : null}
      <View style={styles.personIcon}>
        <View style={styles.personHead} />
        <View style={styles.personBody} />
      </View>
      <BarChart3 color="#29e35f" size={28} style={styles.audioMini} />
    </View>
  );
}

function ControlButton({ icon: Icon, label, active }: { icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; label: string; active?: boolean }) {
  return (
    <View style={styles.controlButton}>
      <View style={[styles.controlCircle, active && styles.controlActive]}><Icon color="#fff" size={25} /></View>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

function Chip({ label, icon: Icon, onPress }: { label: string; icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress}>
      <Icon color={gold} size={21} />
      <Text style={styles.bodyText}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProgressTile({ icon: Icon, label, value, trend }: { icon: React.ComponentType<{ color: string; size: number; strokeWidth?: number }>; label: string; value: string; trend: string }) {
  return (
    <View style={styles.progressTile}>
      <Icon color={gold} size={36} />
      <Text style={styles.muted}>{label}</Text>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.metricBig}>{value}</Text>
      <Text style={styles.goodTrend}>{trend}</Text>
    </View>
  );
}

function RoleStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.roleStat}>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.metricBig}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function HelpPill() {
  return (
    <View style={styles.helpPill}>
      <CircleHelp color="#fff" size={18} />
      <Text style={styles.bodyText}>How it works</Text>
    </View>
  );
}

function BottomNav({ activeTab, onSelect }: { activeTab: TabKey; onSelect: (tab: TabKey) => void }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity key={tab.key} style={styles.tabButton} onPress={() => onSelect(tab.key)}>
            <Icon color={isActive ? gold : '#dce3ea'} size={25} strokeWidth={1.7} />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            {isActive ? <View style={styles.tabIndicator} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: ink,
    flex: 1
  },
  appShell: {
    flex: 1
  },
  container: {
    padding: 20,
    paddingBottom: 116
  },
  welcome: {
    flex: 1,
    padding: 24
  },
  statusSpacer: {
    height: 18
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  brandStacked: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 16
  },
  brandCompact: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  logoText: {
    color: gold,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
    fontSize: 56,
    fontWeight: '900'
  },
  logoTextSmall: {
    color: gold,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
    fontSize: 38,
    fontWeight: '900'
  },
  brandDivider: {
    backgroundColor: 'rgba(255,255,255,0.36)',
    height: 44,
    width: 1
  },
  brandDividerSmall: {
    backgroundColor: 'rgba(255,255,255,0.32)',
    height: 28,
    width: 1
  },
  brandLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3
  },
  brandLabelSmall: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900'
  },
  loggedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingTop: 8
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  avatar: {
    alignItems: 'center',
    borderColor: gold,
    borderRadius: 24,
    borderWidth: 1.5,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900'
  },
  title: {
    color: '#fff',
    fontSize: 43,
    fontWeight: '900',
    lineHeight: 48,
    textAlign: 'center'
  },
  homeTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
    marginBottom: 8
  },
  screenTitle: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42
  },
  subtitle: {
    color: '#c7c7c7',
    fontSize: 18,
    lineHeight: 27,
    marginBottom: 18,
    textAlign: 'center'
  },
  bodyText: {
    color: '#f2f2f2',
    fontSize: 16,
    lineHeight: 23
  },
  muted: {
    color: '#aeb8c2',
    fontSize: 14,
    lineHeight: 20
  },
  goldText: {
    color: gold
  },
  greenText: {
    color: '#29e35f'
  },
  goldCaps: {
    color: gold,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2
  },
  card: {
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18
  },
  cardAccent: {
    borderColor: 'rgba(255,194,26,0.42)'
  },
  cardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29
  },
  welcomeEyebrow: {
    color: gold2,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 5,
    marginTop: 10,
    textAlign: 'center'
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center'
  },
  welcomeCopy: {
    color: '#e5e5e5',
    fontSize: 19,
    lineHeight: 28,
    marginBottom: 18,
    textAlign: 'center'
  },
  agentHaloLarge: {
    alignItems: 'center',
    height: 330,
    justifyContent: 'center',
    marginVertical: 2
  },
  orbitOuter: {
    borderColor: 'rgba(255,194,26,0.18)',
    borderRadius: 145,
    borderWidth: 1,
    height: 290,
    position: 'absolute',
    width: 290
  },
  orbitMiddle: {
    borderColor: 'rgba(255,194,26,0.45)',
    borderRadius: 105,
    borderWidth: 2,
    height: 210,
    position: 'absolute',
    width: 210
  },
  orbitCore: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,194,26,0.1)',
    borderColor: gold,
    borderRadius: 70,
    borderWidth: 1.5,
    height: 140,
    justifyContent: 'center',
    shadowColor: gold,
    shadowOpacity: 0.7,
    shadowRadius: 22,
    width: 140
  },
  featureCallout: {
    alignItems: 'center',
    backgroundColor: 'rgba(9,13,16,0.76)',
    borderColor: 'rgba(255,194,26,0.72)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    position: 'absolute',
    width: 142
  },
  calloutLeftTop: {
    left: 4,
    top: 42
  },
  calloutRightTop: {
    right: 4,
    top: 42
  },
  calloutLeftBottom: {
    left: 4,
    bottom: 42
  },
  calloutRightBottom: {
    right: 4,
    bottom: 42
  },
  calloutLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800'
  },
  calloutCaption: {
    color: '#d8d8d8',
    fontSize: 11
  },
  featureGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  miniFeature: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 138,
    padding: 12
  },
  iconRing: {
    alignItems: 'center',
    borderColor: gold,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: 10,
    width: 56
  },
  miniFeatureTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center'
  },
  miniFeatureCopy: {
    color: '#d8d8d8',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center'
  },
  coachCard: {
    alignItems: 'center',
    borderColor: 'rgba(255,194,26,0.62)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    minHeight: 108,
    padding: 16
  },
  coachTitle: {
    color: '#fff',
    fontSize: 27,
    fontWeight: '900'
  },
  eyeBadge: {
    alignItems: 'center',
    borderColor: gold,
    borderRadius: 48,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    width: 96
  },
  goldButton: {
    alignItems: 'center',
    backgroundColor: gold,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 12,
    minHeight: 72,
    paddingHorizontal: 24,
    shadowColor: gold,
    shadowOpacity: 0.35,
    shadowRadius: 18
  },
  goldButtonText: {
    color: ink,
    flex: 1,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center'
  },
  accountLink: {
    color: gold2,
    fontSize: 16,
    marginTop: 14,
    textAlign: 'center',
    textDecorationLine: 'underline'
  },
  inputLabel: {
    color: '#dce3ea',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 10
  },
  input: {
    backgroundColor: 'rgba(5,11,14,0.86)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    color: '#fff',
    fontSize: 17,
    minHeight: 52,
    paddingHorizontal: 14
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14
  },
  demoRoleCard: {
    backgroundColor: 'rgba(5,11,14,0.72)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 132,
    padding: 12,
    width: '48%'
  },
  demoRoleCardActive: {
    borderColor: gold,
    backgroundColor: 'rgba(255,194,26,0.1)'
  },
  demoRoleTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6
  },
  demoRoleEmail: {
    color: '#dce3ea',
    fontSize: 12,
    marginBottom: 8
  },
  demoRoleCopy: {
    color: '#aeb8c2',
    fontSize: 12,
    lineHeight: 17
  },
  roleHint: {
    color: gold2,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 6
  },
  noteInput: {
    minHeight: 78,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  textArea: {
    minHeight: 114,
    paddingTop: 12,
    textAlignVertical: 'top'
  },
  authError: {
    backgroundColor: 'rgba(255,65,65,0.14)',
    borderColor: 'rgba(255,65,65,0.35)',
    borderRadius: 8,
    borderWidth: 1,
    color: '#ffb4b4',
    marginTop: 12,
    padding: 12
  },
  disabledButton: {
    opacity: 0.62
  },
  agentEyeHero: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,194,26,0.08)',
    borderColor: 'rgba(255,194,26,0.5)',
    borderRadius: 125,
    borderWidth: 1,
    height: 250,
    justifyContent: 'center',
    marginVertical: 16,
    shadowColor: gold,
    shadowOpacity: 0.55,
    shadowRadius: 26,
    width: 250
  },
  smartAgentCard: {
    alignItems: 'center'
  },
  roleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14
  },
  roleChip: {
    borderColor: 'rgba(255,194,26,0.58)',
    borderRadius: 8,
    borderWidth: 1,
    color: gold,
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  centerTitle: {
    color: '#fff',
    fontSize: 31,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center'
  },
  centerCopy: {
    color: '#d8d8d8',
    fontSize: 17,
    marginBottom: 14,
    textAlign: 'center'
  },
  promptBar: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 62,
    paddingHorizontal: 12,
    width: '100%'
  },
  promptInput: {
    color: '#fff',
    flex: 1,
    fontSize: 17
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: gold,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46
  },
  quickChips: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    width: '100%'
  },
  chip: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 8
  },
  notice: {
    backgroundColor: 'rgba(255,194,26,0.12)',
    borderColor: 'rgba(255,194,26,0.28)',
    borderRadius: 8,
    borderWidth: 1,
    color: gold2,
    lineHeight: 21,
    marginBottom: 14,
    padding: 12
  },
  progressGrid: {
    flexDirection: 'row',
    gap: 8
  },
  progressTile: {
    alignItems: 'center',
    borderRightColor: 'rgba(255,255,255,0.18)',
    borderRightWidth: 1,
    flex: 1,
    minHeight: 128,
    padding: 6
  },
  roleStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14
  },
  roleStat: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 86,
    justifyContent: 'center',
    padding: 8
  },
  roleListRow: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    minHeight: 70,
    padding: 12
  },
  metricBig: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
    marginVertical: 6
  },
  goodTrend: {
    color: '#29e35f',
    fontSize: 14
  },
  badTrend: {
    color: '#ff4141',
    fontSize: 14,
    marginTop: 7
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  rowCenter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  quickAccessItem: {
    alignItems: 'center',
    borderColor: 'rgba(255,194,26,0.5)',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 126,
    padding: 10,
    width: '31.5%'
  },
  quickAccessLabel: {
    color: gold,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center'
  },
  quickAccessCaption: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center'
  },
  tabBar: {
    backgroundColor: 'rgba(3,8,10,0.98)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    paddingBottom: 12,
    paddingHorizontal: 5,
    paddingTop: 8,
    position: 'absolute',
    right: 0
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    minHeight: 58,
    justifyContent: 'center'
  },
  tabText: {
    color: '#dce3ea',
    fontSize: 10,
    textAlign: 'center'
  },
  tabTextActive: {
    color: gold,
    fontWeight: '900'
  },
  tabIndicator: {
    backgroundColor: gold,
    borderRadius: 4,
    height: 3,
    marginTop: 2,
    width: 42
  },
  titleBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  helpPill: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  stageCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20
  },
  stageCopy: {
    flex: 1
  },
  progressRing: {
    alignItems: 'center',
    borderColor: gold,
    borderLeftColor: 'rgba(255,194,26,0.22)',
    borderRadius: 70,
    borderWidth: 12,
    height: 140,
    justifyContent: 'center',
    width: 140
  },
  progressPercent: {
    color: gold,
    fontSize: 33,
    fontWeight: '900'
  },
  progressLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center'
  },
  progressBar: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 6,
    height: 10,
    marginVertical: 10,
    overflow: 'hidden'
  },
  progressFill: {
    backgroundColor: gold,
    borderRadius: 6,
    height: '100%',
    width: '62%'
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 18
  },
  roadmapRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,17,21,0.88)',
    borderColor: 'rgba(255,255,255,0.13)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
    minHeight: 86,
    padding: 14
  },
  roadmapRowActive: {
    borderColor: gold
  },
  stepIconCircle: {
    alignItems: 'center',
    borderColor: gold,
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  stepDone: {
    backgroundColor: '#29e35f',
    borderColor: '#29e35f'
  },
  stepIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900'
  },
  stepTextBlock: {
    flex: 1
  },
  rowTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24
  },
  badge: {
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  completed: {
    backgroundColor: 'rgba(41,227,95,0.14)',
    color: '#29e35f'
  },
  locked: {
    backgroundColor: 'rgba(124,135,145,0.18)',
    color: '#b9c0c8'
  },
  goldSmallButton: {
    backgroundColor: gold,
    borderRadius: 8,
    color: ink,
    fontSize: 15,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  smallGoldAction: {
    alignItems: 'center',
    backgroundColor: gold,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  smallGoldActionText: {
    color: ink,
    fontWeight: '900'
  },
  backLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16
  },
  stepDetailTitle: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
    marginBottom: 12
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: 'rgba(255,194,26,0.7)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pillText: {
    color: gold,
    fontSize: 16,
    fontWeight: '900'
  },
  sectionLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  videoMock: {
    alignItems: 'center',
    backgroundColor: '#211a15',
    borderRadius: 8,
    height: 210,
    justifyContent: 'center',
    marginTop: 14,
    overflow: 'hidden'
  },
  playCircle: {
    alignItems: 'center',
    borderColor: '#fff',
    borderRadius: 46,
    borderWidth: 3,
    height: 92,
    justifyContent: 'center',
    width: 92
  },
  videoTime: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    bottom: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    left: 16,
    padding: 6,
    position: 'absolute'
  },
  quoteBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 16
  },
  quoteMark: {
    color: gold,
    fontSize: 54,
    fontWeight: '900'
  },
  quoteText: {
    color: '#fff',
    flex: 1,
    fontSize: 18,
    lineHeight: 27
  },
  centerLink: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center'
  },
  audioBar: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
    minHeight: 78,
    padding: 14
  },
  audioPlay: {
    alignItems: 'center',
    backgroundColor: gold,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  waveform: {
    color: gold,
    flex: 1,
    fontSize: 23,
    letterSpacing: 1
  },
  headerLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  eyeSmall: {
    alignItems: 'center',
    borderColor: 'rgba(255,194,26,0.44)',
    borderRadius: 50,
    borderWidth: 1,
    height: 100,
    justifyContent: 'center',
    width: 100
  },
  goalHeaderActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  dateButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,194,26,0.55)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  historyButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,194,26,0.55)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  goalSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14
  },
  goalIcon: {
    alignItems: 'center',
    borderColor: gold,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  goalSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900'
  },
  optionGrid: {
    flexDirection: 'row',
    gap: 8
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  optionCard: {
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 88,
    padding: 12,
    position: 'relative'
  },
  optionSelected: {
    borderColor: gold
  },
  optionLead: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center'
  },
  optionCheck: {
    alignItems: 'center',
    backgroundColor: gold,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20
  },
  optionEmpty: {
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20
  },
  inputBlock: {
    flex: 1
  },
  selectMock: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 14
  },
  metricCards: {
    flexDirection: 'row',
    gap: 8
  },
  goalMetric: {
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 8
  },
  followRow: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    minHeight: 44,
    paddingHorizontal: 12
  },
  agentInsight: {
    alignItems: 'center',
    borderColor: gold,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    padding: 14
  },
  roleplayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 4
  },
  roleplayTitleBlock: {
    alignItems: 'center'
  },
  liveText: {
    color: '#29e35f',
    fontSize: 14,
    fontWeight: '900'
  },
  endButton: {
    backgroundColor: '#df2435',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  endText: {
    color: '#fff',
    fontWeight: '900'
  },
  roleplayStats: {
    flexDirection: 'row'
  },
  statBlock: {
    borderRightColor: 'rgba(255,255,255,0.16)',
    borderRightWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 6
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900'
  },
  videoPanels: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  participantCard: {
    backgroundColor: '#171d23',
    borderRadius: 8,
    flex: 1,
    height: 420,
    padding: 18,
    position: 'relative'
  },
  participantLabel: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  speakingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 18,
    width: 48
  },
  personIcon: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  personHead: {
    backgroundColor: '#e8e8e8',
    borderRadius: 42,
    height: 84,
    width: 84
  },
  personBody: {
    backgroundColor: '#e8e8e8',
    borderTopLeftRadius: 54,
    borderTopRightRadius: 54,
    height: 86,
    marginTop: 12,
    width: 142
  },
  audioMini: {
    bottom: 18,
    left: 18,
    position: 'absolute'
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  controlButton: {
    alignItems: 'center',
    flex: 1,
    gap: 8
  },
  controlCircle: {
    alignItems: 'center',
    backgroundColor: '#242a30',
    borderRadius: 31,
    height: 62,
    justifyContent: 'center',
    width: 62
  },
  controlActive: {
    backgroundColor: '#148b32'
  },
  controlLabel: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center'
  },
  tipCard: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    padding: 16
  },
  tipText: {
    color: '#fff',
    flex: 1,
    fontSize: 18,
    lineHeight: 27
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: 'rgba(255,194,26,0.55)',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    minHeight: 48,
    justifyContent: 'center'
  },
  secondaryActionText: {
    color: gold,
    fontWeight: '900'
  },
  insight: {
    backgroundColor: 'rgba(255,194,26,0.1)',
    borderColor: 'rgba(255,194,26,0.28)',
    borderRadius: 8,
    borderWidth: 1,
    color: gold2,
    lineHeight: 21,
    marginTop: 12,
    padding: 12
  }
});
