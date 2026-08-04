'use client';

import { useState } from 'react';
import { signOut } from 'aws-amplify/auth';
import ReactMarkdown from 'react-markdown';
import Timeline from '@/components/Timeline';
import BlockList from '@/components/BlockList';
import {
  createSession,
  updateSession,
  breakdownSession,
  scheduleSession,
  completeSession,
  getInsights,
  getSessionDetails,
  Subtask,
  ScheduleBlock,
} from '@/lib/api';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function todayAt(hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

type Stage = 'input' | 'breakdown' | 'scheduled';

function HomeContent() {
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('session');

  const [rawInput, setRawInput] = useState('');
  const [dayStart, setDayStart] = useState(toLocalInputValue(todayAt(9)));
  const [dayEnd, setDayEnd] = useState(toLocalInputValue(todayAt(17)));

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [stage, setStage] = useState<Stage>('input');

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [insightQuery, setInsightQuery] = useState('');
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    if (sessionIdParam) {
      setLoading('load_session');
      getSessionDetails(sessionIdParam).then(data => {
        setSessionId(data.session_id);
        setRawInput(data.raw_input);
        setDayStart(toLocalInputValue(new Date(data.day_start + "Z"))); // parse as UTC
        setDayEnd(toLocalInputValue(new Date(data.day_end + "Z")));
        setSubtasks(data.subtasks);
        setBlocks(data.blocks);
        if (data.blocks.length > 0) setStage('scheduled');
        else if (data.subtasks.length > 0) setStage('breakdown');
        else setStage('input');
      }).catch(err => {
        console.error(err);
        setError("Could not load session.");
      }).finally(() => setLoading(null));
    } else {
      setSessionId(null);
      setRawInput('');
      setDayStart(toLocalInputValue(todayAt(9)));
      setDayEnd(toLocalInputValue(todayAt(17)));
      setSubtasks([]);
      setBlocks([]);
      setStage('input');
      setError(null);
    }
  }, [sessionIdParam]);

  async function handleBreakdown() {
    setError(null);
    setLoading('breakdown');
    try {
      let currentSessionId = sessionId;
      if (currentSessionId) {
        await updateSession(currentSessionId, {
          raw_input: rawInput,
          day_start: new Date(dayStart).toISOString(),
          day_end: new Date(dayEnd).toISOString(),
        });
        window.dispatchEvent(new Event('session_update'));
      } else {
        const session = await createSession({
          raw_input: rawInput,
          day_start: new Date(dayStart).toISOString(),
          day_end: new Date(dayEnd).toISOString(),
        });
        currentSessionId = session.session_id;
        setSessionId(currentSessionId);
        window.dispatchEvent(new Event('session_update'));
      }

      const breakdown = await breakdownSession(currentSessionId);
      setSubtasks(breakdown.subtasks);
      setStage('breakdown');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong breaking this down.');
    } finally {
      setLoading(null);
    }
  }

  async function handleSchedule() {
    if (!sessionId) return;
    setError(null);
    setLoading('schedule');
    try {
      const result = await scheduleSession(sessionId);
      if (result.blocks.length === 0) {
        setError("Your schedule couldn't fit into this day. Try widening your start and end times.");
      } else {
        setBlocks(result.blocks);
        setStage('scheduled');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not fit these into the day.');
    } finally {
      setLoading(null);
    }
  }

  async function handleComplete() {
    if (!sessionId) return;
    setError(null);
    setLoading('complete');
    try {
      await completeSession(sessionId);
      // maybe show a success state or return to history
      setStage('input');
      setSessionId(null);
      setBlocks([]);
      setRawInput('');
      window.dispatchEvent(new Event('session_update'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this session.');
    } finally {
      setLoading(null);
    }
  }

  async function handleAskInsight() {
    if (!insightQuery.trim()) return;
    setError(null);
    setLoading('insight');
    try {
      const result = await getInsights(insightQuery);
      setInsight(result.insight);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not retrieve insights.');
    } finally {
      setLoading(null);
    }
  }

  const daySpanMinutes =
    (new Date(dayEnd).getTime() - new Date(dayStart).getTime()) / 60000;

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  }

  return (
    <main className="min-h-screen px-6 py-16 md:py-24 max-w-3xl mx-auto">
      <header className="mb-14 flex justify-between items-start">
        <div>
          <p className="font-mono text-xs tracking-widest text-work uppercase mb-3">
            FocusFlow
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-tight text-ink">
            Say the day out loud.
            <br />
            <span className="text-muted">We&apos;ll cut it into blocks you can finish.</span>
          </h1>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-xs font-mono text-muted hover:text-ink transition-colors border border-border px-3 py-1.5 rounded-md"
        >
          Sign out
        </button>
      </header>

      {/* Step 1: input */}
      <section className="mb-10">
        <label htmlFor="raw-input" className="block font-body text-sm text-muted mb-2">
          What&apos;s on your plate today?
        </label>
        <textarea
          id="raw-input"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Finish job applications, review DSA notes, prep for Thursday's interview…"
          rows={3}
          className="w-full bg-surface border border-border rounded-md px-4 py-3 text-ink placeholder:text-muted/60 focus:border-work outline-none resize-none"
        />

        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <label htmlFor="day-start" className="block font-mono text-xs text-muted mb-1">
              Start
            </label>
            <input
              id="day-start"
              type="datetime-local"
              value={dayStart}
              onChange={(e) => setDayStart(e.target.value)}
              className="w-full bg-surface border border-border rounded-md px-3 py-2 font-mono text-sm text-ink outline-none focus:border-work"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="day-end" className="block font-mono text-xs text-muted mb-1">
              End
            </label>
            <input
              id="day-end"
              type="datetime-local"
              value={dayEnd}
              onChange={(e) => setDayEnd(e.target.value)}
              className="w-full bg-surface border border-border rounded-md px-3 py-2 font-mono text-sm text-ink outline-none focus:border-work"
            />
          </div>
        </div>

        <button
          onClick={handleBreakdown}
          disabled={!rawInput.trim() || loading === 'breakdown'}
          className="mt-5 bg-work text-bg font-body font-medium px-5 py-2.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {loading === 'breakdown' ? 'Breaking it down…' : 'Break it down'}
        </button>
      </section>

      {error && (
        <p className="mb-8 text-sm text-rest/90 border border-rest/30 bg-rest/10 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      {/* Step 2: subtasks */}
      {stage !== 'input' && subtasks.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl text-ink mb-4">The breakdown</h2>
          <ul className="space-y-2">
            {subtasks.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-surface border border-border rounded-md px-4 py-3"
              >
                <span className="text-ink text-sm">{s.title}</span>
                <span className="font-mono text-xs text-work whitespace-nowrap ml-4">
                  {s.estimated_minutes}m
                </span>
              </li>
            ))}
          </ul>

          {stage === 'breakdown' && (
            <button
              onClick={handleSchedule}
              disabled={loading === 'schedule'}
              className="mt-5 bg-ink text-bg font-body font-medium px-5 py-2.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {loading === 'schedule' ? 'Laying out the day…' : 'Schedule my day'}
            </button>
          )}
        </section>
      )}

      {/* Step 3: timeline (the signature element) */}
      {stage === 'scheduled' && blocks.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-xl text-ink mb-4">Your day, end to end</h2>
          <Timeline blocks={blocks} daySpanMinutes={daySpanMinutes} />
          <div className="flex gap-4 mt-3 font-mono text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-work inline-block" /> focus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rest/30 inline-block" /> break
            </span>
          </div>

          <BlockList 
            blocks={blocks} 
            sessionId={sessionId!} 
            onBlockUpdated={(blockId, updates) => {
              setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
            }}
          />

          <button
            onClick={handleComplete}
            disabled={loading === 'complete'}
            className="mt-6 border border-border text-ink font-body px-5 py-2.5 rounded-md hover:border-work transition-colors disabled:opacity-40"
          >
            {loading === 'complete' ? 'Saving…' : 'End of day — save this session'}
          </button>
        </section>
      )}

      {/* Insights */}
      <section className="mt-16 pt-10 border-t border-border">
        <h2 className="font-display text-xl text-ink mb-2">Ask about your patterns</h2>
        <p className="text-sm text-muted mb-4">
          Draws on past saved sessions — the more you save, the more it has to work with.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={insightQuery}
            onChange={(e) => setInsightQuery(e.target.value)}
            placeholder="What tasks take me longer than expected?"
            className="flex-1 bg-surface border border-border rounded-md px-4 py-2.5 text-ink placeholder:text-muted/60 outline-none focus:border-work"
          />
          <button
            onClick={handleAskInsight}
            disabled={!insightQuery.trim() || loading === 'insight'}
            className="bg-work text-bg font-body font-medium px-5 py-2.5 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {loading === 'insight' ? 'Thinking…' : 'Ask'}
          </button>
        </div>
        {insight && (
          <div className="mt-4 text-ink text-sm leading-relaxed bg-surface border-l-2 border-work rounded-r-md px-4 py-3 prose prose-invert max-w-none">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        )}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen px-6 py-16 md:py-24 max-w-3xl mx-auto flex items-center justify-center text-muted">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
