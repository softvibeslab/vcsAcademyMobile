import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bot, ClipboardCheck, GraduationCap, LogIn, LogOut, ShieldCheck, Target, Trophy } from 'lucide-react';
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

  function clearSession() {
    window.localStorage.removeItem(SESSION_KEY);
    setToken('');
    setUser(null);
    setDashboard(null);
    setSteps([]);
    setAgent(null);
    setGoalsheet(null);
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
      setError('');
    } catch (err) {
      setError(err.message);
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

  async function askAgent() {
    const data = await api('/api/smart-agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Help me practice Step 5', mode: 'blueprint_step' })
    });
    setAgent(data);
  }

  const completedCount = useMemo(() => steps.filter((step) => step.status === 'completed').length, [steps]);

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
          </div>
          {agent && <p className="insight">{agent.response}</p>}
          {goalsheet && <p className="insight">{goalsheet.smart_agent_insight}</p>}
        </article>

        <article className="panel">
          <div className="panel-title">
            <GraduationCap />
            <h2>Certification</h2>
          </div>
          <p>Status: {dashboard?.certification_status || 'loading'}</p>
          <p>Next lesson: {dashboard?.next_lesson?.title || 'Loading'}</p>
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

      <section className="panel">
        <div className="panel-title">
          <ShieldCheck />
          <h2>Compliance Guardrails</h2>
        </div>
        <p>Pricing, fees, incentives, and legal materials require approved sources and permission checks. Smart Agent redirects unsafe requests.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
