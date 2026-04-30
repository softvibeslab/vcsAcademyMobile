import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bot, ClipboardCheck, FileText, GraduationCap, LayoutDashboard, LogIn, LogOut, ShieldCheck, Target, Trophy, Users } from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';
const SESSION_KEY = 'vcsa_token';

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem(SESSION_KEY) || '');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('rep@vcsa.local');
  const [password, setPassword] = useState('demo123');
  const [dashboard, setDashboard] = useState(null);
  const [steps, setSteps] = useState([]);
  const [goalsheet, setGoalsheet] = useState(null);
  const [agent, setAgent] = useState(null);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeView, setActiveView] = useState('rep');
  const [resources, setResources] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [managerDashboard, setManagerDashboard] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminResources, setAdminResources] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);

  function clearSession() {
    window.localStorage.removeItem(SESSION_KEY);
    setToken('');
    setUser(null);
    setDashboard(null);
    setSteps([]);
    setAgent(null);
    setGoalsheet(null);
    setResources([]);
    setFeedback([]);
    setCertifications([]);
    setManagerDashboard(null);
    setAdminUsers([]);
    setAdminResources([]);
    setAuditEvents([]);
    setActiveView('rep');
  }

  async function api(path, options = {}, tokenOverride = token) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOverride}`,
        ...(options.headers || {})
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
    try {
      const [meData, dashboardData, blueprintData] = await Promise.all([
        api('/api/mobile/me', {}, sessionToken),
        api('/api/dashboard/rep', {}, sessionToken),
        api('/api/blueprint/steps', {}, sessionToken)
      ]);
      setUser(meData.user);
      setDashboard(dashboardData);
      setSteps(blueprintData.steps);
      await loadRoleData(meData.user, sessionToken);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadRoleData(currentUser = user, sessionToken = token) {
    if (!currentUser || !sessionToken) return;
    const isManager = currentUser.roles?.some((role) => ['manager', 'trainer', 'coach', 'to_manager', 'admin'].includes(role));
    const isAdmin = currentUser.roles?.includes('admin');
    const [resourceData, feedbackData, certificationData] = await Promise.all([
      api('/api/resources', {}, sessionToken),
      api('/api/roleplay/submissions/mine', {}, sessionToken),
      api('/api/certifications/mine', {}, sessionToken)
    ]);
    setResources(resourceData.resources);
    setFeedback(feedbackData.submissions);
    setCertifications(certificationData.decisions);

    if (isManager) {
      const teamData = await api('/api/manager/team-dashboard', {}, sessionToken);
      setManagerDashboard(teamData);
    }
    if (isAdmin) {
      const [usersData, resourcesData, auditData] = await Promise.all([
        api('/api/admin/users', {}, sessionToken),
        api('/api/admin/resources', {}, sessionToken),
        api('/api/admin/audit-events', {}, sessionToken)
      ]);
      setAdminUsers(usersData.users);
      setAdminResources(resourcesData.resources);
      setAuditEvents(auditData.events);
    }
  }

  useEffect(() => {
    if (token) {
      load(token);
    }
  }, [token]);

  async function login(event) {
    event.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'Login failed');
      window.localStorage.setItem(SESSION_KEY, payload.data.token);
      setToken(payload.data.token);
      setUser(payload.data.user);
      await load(payload.data.token);
    } catch (err) {
      clearSession();
      setAuthError(err.message);
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
      // The local session should be cleared even if the token has already expired.
    } finally {
      clearSession();
    }
  }

  async function saveGoalSheet() {
    const entry = await api('/api/goalsheet', {
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
    setGoalsheet(entry.entry);
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
      body: JSON.stringify({ session_id: sessionData.session.id, transcript: 'Submitted from webapp launch flow.' })
    });
    await load();
  }

  async function certifyFirstRep(status = 'needs_practice') {
    const rep = managerDashboard?.reps?.[0]?.user;
    if (!rep) return;
    await api(`/api/certifications/${rep.id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ status, notes: status === 'approved' ? 'Approved for certification.' : 'Continue practice before final approval.' })
    });
    await load();
  }

  async function publishLaunchResource() {
    await api('/api/admin/resources', {
      method: 'POST',
      body: JSON.stringify({
        id: 'go-live-readiness',
        title: 'Go Live Readiness',
        resource_type: 'checklist',
        sensitivity: 'general_training',
        requires_access_grant: false,
        body: 'Release readiness checklist for web, iOS, Android, backend, QA, and support.',
        tags: ['launch', 'qa'],
        status: 'published'
      })
    });
    await load();
  }

  async function askAgent() {
    const data = await api('/api/smart-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Help me practice Step 5', mode: 'blueprint_step' })
    });
    setAgent(data);
  }

  const completedCount = useMemo(() => steps.filter((step) => step.status === 'completed').length, [steps]);
  const isManager = user?.roles?.some((role) => ['manager', 'trainer', 'coach', 'to_manager', 'admin'].includes(role));
  const isAdmin = user?.roles?.includes('admin');

  if (!token) {
    return (
      <main className="app auth-app">
        <section className="auth-shell">
          <div className="auth-copy">
            <Pill>WL Sales Academy</Pill>
            <h1>Sign in to the Blueprint command center.</h1>
            <p>Access training, GoalSheet tracking, roleplay coaching, and certification progress from one protected workspace.</p>
          </div>
          <form className="auth-panel" onSubmit={login}>
            <div className="panel-title">
              <ShieldCheck />
              <h2>Secure access</h2>
            </div>
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </label>
            <label>
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
            </label>
            {authError && <p className="auth-error">{authError}</p>}
            <button type="submit" disabled={isAuthenticating}>
              <LogIn size={18} />
              {isAuthenticating ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <section className="hero">
        <div>
          <Pill>WL Sales Academy</Pill>
          <h1>Daily command center for Blueprint mastery.</h1>
          <p>{user?.display_name ? `Signed in as ${user.display_name}. ` : ''}Train, roleplay, log performance, and get compliant Smart Agent coaching from one premium workspace.</p>
        </div>
        <div className="hero-actions">
          <button className="ghost-button" onClick={logout}>
            <LogOut size={18} />
            Sign out
          </button>
          <div className="agent-eye" aria-label="Smart Agent eye">
            <Bot size={52} />
          </div>
        </div>
      </section>

      {error && <section className="error">API error: {error}</section>}

      <nav className="workspace-nav" aria-label="Workspace views">
        <button className={activeView === 'rep' ? 'nav-active' : 'ghost-button'} onClick={() => setActiveView('rep')}>
          <LayoutDashboard size={17} /> Rep
        </button>
        {isManager && (
          <button className={activeView === 'manager' ? 'nav-active' : 'ghost-button'} onClick={() => setActiveView('manager')}>
            <Users size={17} /> Manager
          </button>
        )}
        {isAdmin && (
          <button className={activeView === 'admin' ? 'nav-active' : 'ghost-button'} onClick={() => setActiveView('admin')}>
            <ShieldCheck size={17} /> Admin
          </button>
        )}
      </nav>

      {activeView === 'rep' && (
        <>
          <section className="grid">
            <article className="panel span-2">
              <div className="panel-title">
                <Target />
                <h2>{dashboard?.greeting || 'Loading dashboard...'}</h2>
              </div>
              <div className="metrics">
                <Metric label="Blueprint" value={`${dashboard?.blueprint_progress ?? 0}%`} />
                <Metric label="Completed" value={`${completedCount}/11`} />
                <Metric label="Closing" value={`${dashboard?.metrics?.closing_percent ?? 0}%`} />
                <Metric label="VPG" value={`$${dashboard?.metrics?.vpg ?? 0}`} />
              </div>
              <div className="actions">
                <button onClick={askAgent}><Bot size={18} /> Ask Smart Agent</button>
                <button onClick={saveGoalSheet}><ClipboardCheck size={18} /> Save GoalSheet</button>
                <button onClick={completeNextStep}><Trophy size={18} /> Complete Step</button>
                <button onClick={submitRoleplay}><GraduationCap size={18} /> Submit Roleplay</button>
              </div>
              {agent && <p className="insight">{agent.response}</p>}
              {goalsheet && <p className="insight">{goalsheet.smart_agent_insight}</p>}
            </article>

            <article className="panel">
              <div className="panel-title">
                <GraduationCap />
                <h2>Certification</h2>
              </div>
              <p>Status: {certifications[0]?.status || dashboard?.certification_status || 'loading'}</p>
              <p>Next lesson: {dashboard?.next_lesson?.title || 'Loading'}</p>
              {certifications[0]?.notes && <p className="muted">{certifications[0].notes}</p>}
            </article>
          </section>

          <section className="panel">
            <div className="panel-title">
              <Trophy />
              <h2>Top Producer Roadmap</h2>
            </div>
            <div className="roadmap">
              {steps.map((step) => (
                <div className="step" key={step.id}>
                  <strong>{step.step_number}. {step.title}</strong>
                  <span className={`status ${step.status}`}>{step.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid">
            <article className="panel">
              <div className="panel-title">
                <FileText />
                <h2>Resources</h2>
              </div>
              <div className="list">
                {resources.map((resource) => (
                  <div className="list-row" key={resource.id}>
                    <strong>{resource.title}</strong>
                    <span className={`status ${resource.has_access ? 'completed' : 'locked'}`}>{resource.has_access ? 'available' : 'restricted'}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-title">
                <ShieldCheck />
                <h2>Feedback</h2>
              </div>
              <div className="list">
                {feedback.length ? feedback.slice(0, 4).map((item) => (
                  <div className="list-row" key={item.id}>
                    <strong>{item.status}</strong>
                    <span>{item.manager_feedback?.recommendation || 'awaiting review'}</span>
                  </div>
                )) : <p className="muted">No roleplay feedback yet.</p>}
              </div>
            </article>
          </section>
        </>
      )}

      {activeView === 'manager' && (
        <section className="panel">
          <div className="panel-title">
            <Users />
            <h2>Team Dashboard</h2>
          </div>
          <div className="metrics">
            <Metric label="Active reps" value={managerDashboard?.summary?.active_reps ?? 0} />
            <Metric label="Pending reviews" value={managerDashboard?.summary?.pending_reviews ?? 0} />
            <Metric label="Team closing" value={`${managerDashboard?.summary?.team_metrics?.closing_percent ?? 0}%`} />
            <Metric label="Team VPG" value={`$${managerDashboard?.summary?.team_metrics?.vpg ?? 0}`} />
          </div>
          <div className="actions">
            <button onClick={() => certifyFirstRep('needs_practice')}><GraduationCap size={18} /> Mark Needs Practice</button>
            <button onClick={() => certifyFirstRep('approved')}><ShieldCheck size={18} /> Approve Certification</button>
          </div>
          <div className="list">
            {managerDashboard?.reps?.map((rep) => (
              <div className="list-row" key={rep.user.id}>
                <strong>{rep.user.display_name}</strong>
                <span>{rep.blueprint_progress}% Blueprint · {rep.certification_status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === 'admin' && (
        <section className="grid">
          <article className="panel">
            <div className="panel-title">
              <ShieldCheck />
              <h2>Admin Users</h2>
            </div>
            <div className="list">
              {adminUsers.map((item) => (
                <div className="list-row" key={item.id}>
                  <strong>{item.display_name}</strong>
                  <span>{item.roles.join(', ')}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-title">
              <FileText />
              <h2>Content</h2>
            </div>
            <div className="actions compact-actions">
              <button onClick={publishLaunchResource}><FileText size={18} /> Publish Go Live Resource</button>
            </div>
            <div className="list">
              {adminResources.slice(0, 5).map((item) => (
                <div className="list-row" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.status} · {item.sensitivity}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel span-2">
            <div className="panel-title">
              <ShieldCheck />
              <h2>Audit Log</h2>
            </div>
            <div className="list">
              {auditEvents.slice(0, 8).map((event) => (
                <div className="list-row" key={event.id}>
                  <strong>{event.action}</strong>
                  <span>{event.outcome} · {event.target_type}:{event.target_id}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
