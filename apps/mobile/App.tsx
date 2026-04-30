import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8001';

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

async function api(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail || 'Request failed');
  return payload.data;
}

export default function App() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [agentResponse, setAgentResponse] = useState('');

  async function load() {
    const [dashboardData, stepsData] = await Promise.all([
      api('/api/dashboard/rep'),
      api('/api/blueprint/steps')
    ]);
    setDashboard(dashboardData);
    setSteps(stepsData.steps);
  }

  useEffect(() => {
    load().catch((error) => setAgentResponse(`API error: ${error.message}`));
  }, []);

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
          {agentResponse ? <Text style={styles.insight}>{agentResponse}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Top Producer Roadmap</Text>
        {steps.map((step) => (
          <View key={step.id} style={styles.step}>
            <Text style={styles.stepTitle}>{step.step_number}. {step.title}</Text>
            <Text style={[styles.badge, styles[step.status as 'completed' | 'current' | 'locked']]}>{step.status}</Text>
          </View>
        ))}
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
