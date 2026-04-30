import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bot, ClipboardCheck, GraduationCap, ShieldCheck, Target, Trophy } from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';

async function api(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || payload.error?.message || 'Request failed');
  return payload.data;
}

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
  const [dashboard, setDashboard] = useState(null);
  const [steps, setSteps] = useState([]);
  const [goalsheet, setGoalsheet] = useState(null);
  const [agent, setAgent] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [dashboardData, blueprintData] = await Promise.all([
        api('/api/dashboard/rep'),
        api('/api/blueprint/steps')
      ]);
      setDashboard(dashboardData);
      setSteps(blueprintData.steps);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  return (
    <main className="app">
      <section className="hero">
        <div>
          <Pill>WL Sales Academy</Pill>
          <h1>Daily command center for Blueprint mastery.</h1>
          <p>Train, roleplay, log performance, and get compliant Smart Agent coaching from one premium workspace.</p>
        </div>
        <div className="agent-eye" aria-label="Smart Agent eye">
          <Bot size={52} />
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
