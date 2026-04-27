import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Subtask {
  title: string;
  estimated_pomodoros: number;
}

export interface ScheduleBlock {
  id: string;
  task_title: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  completed: boolean;
}

async function fetchApi(path: string, options?: RequestInit) {
  let token = '';
  try {
    const session = await fetchAuthSession();
    token = session.tokens?.idToken?.toString() || '';
  } catch (e) {
    // Not logged in or no session
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    let message = 'An error occurred';
    try {
      const data = await res.json();
      message = data.detail || data.message || message;
    } catch (e) {}
    throw new Error(message);
  }
  return res.json();
}

export function createSession(data: { raw_input: string; day_start: string; day_end: string }) {
  return fetchApi('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function breakdownSession(sessionId: string) {
  return fetchApi(`/sessions/${sessionId}/breakdown`, {
    method: 'POST',
  });
}

export function scheduleSession(sessionId: string) {
  return fetchApi(`/sessions/${sessionId}/schedule`, {
    method: 'POST',
  });
}

export function completeSession(sessionId: string) {
  return fetchApi(`/sessions/${sessionId}/complete`, {
    method: 'POST',
  });
}

export function getInsights(query: string) {
  return fetchApi(`/insights?query=${encodeURIComponent(query)}`, {
    method: 'GET',
  });
}