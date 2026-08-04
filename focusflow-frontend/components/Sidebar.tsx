'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSessionHistory, SessionHistoryItem, deleteSession } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { PanelLeftClose } from 'lucide-react';

export default function Sidebar({ 
  isMobile, 
  toggleSidebar 
}: { 
  isMobile?: boolean; 
  toggleSidebar?: () => void;
}) {
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  
  const searchParams = useSearchParams();
  const currentSessionId = searchParams.get('session');
  const router = useRouter();

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

    const handleUpdate = () => loadHistory();
    window.addEventListener('session_update', handleUpdate);
    return () => window.removeEventListener('session_update', handleUpdate);
  }, [currentSessionId]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      if (currentSessionId === id) {
        router.push('/');
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({
      id,
      x: e.clientX,
      y: e.clientY
    });
  };

  return (
    <div className="w-full h-full border-r border-border bg-bg-light flex flex-col shrink-0">
      <div className="p-4 border-b border-border flex justify-between items-center gap-2">
        <button
          onClick={() => toggleSidebar?.()}
          className="p-2 rounded-md text-muted hover:bg-border/50 hover:text-ink transition-colors focus:outline-none"
          aria-label="Close Sidebar"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>
        <Link 
          href="/"
          onClick={() => isMobile && toggleSidebar?.()}
          className="flex-1 flex items-center justify-center py-2 px-4 border border-border rounded-md text-sm font-mono text-ink hover:bg-border/50 transition-colors"
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
                  onClick={() => isMobile && toggleSidebar?.()}
                  onContextMenu={(e) => handleContextMenu(e, session.id)}
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
        
        {contextMenu && (
          <div 
            className="fixed z-50 bg-bg-light border border-border rounded-md shadow-lg py-1 min-w-[120px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => handleDelete(contextMenu.id)}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-border/50 transition-colors"
            >
              Delete Session
            </button>
          </div>
        )}
      </div>
    );
  }