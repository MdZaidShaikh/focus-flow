'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSessionHistory, SessionHistoryItem } from '@/lib/api';

export default function Sidebar() {
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get('session');

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getSessionHistory();
        setSessions(data.sessions);
      } catch (error) {
        console.error('Failed to load session history:', error);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [currentSessionId]);

  return (
    <div className="w-64 border-r border-border h-screen bg-bg-light flex flex-col hidden md:flex sticky top-0 shrink-0">
      <div className="p-4 border-b border-border">
        <Link 
          href="/"
          className="flex items-center justify-center w-full py-2 px-4 border border-border rounded-md text-sm font-mono text-ink hover:bg-border/50 transition-colors"
        >
          + New Session
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-2 text-xs font-mono text-muted mb-3 uppercase tracking-wider">History</p>
        
        {loading ? (
          <p className="px-2 text-sm text-muted">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 text-sm text-muted">No past sessions yet.</p>
        ) : (
          sessions.map((session) => {
            const isActive = currentSessionId === session.id;
            const titlePreview = session.raw_input.split('\n')[0].slice(0, 30) + (session.raw_input.length > 30 ? '...' : '');
            
            return (
              <Link
                key={session.id}
                href={`/?session=${session.id}`}
                className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive 
                    ? 'bg-ink text-bg' 
                    : 'text-muted hover:bg-border/50 hover:text-ink'
                }`}
              >
                <div className="font-medium truncate">{titlePreview || "Empty Session"}</div>
                <div className={`text-xs mt-1 ${isActive ? 'text-bg/70' : 'text-muted/70'}`}>
                  {new Date(session.created_at).toLocaleDateString()}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}