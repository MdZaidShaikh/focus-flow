'use client';

import { useState } from 'react';
import { ScheduleBlock, updateBlock } from '@/lib/api';
import { Check, Edit2, X, Save } from 'lucide-react';

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function BlockList({
  blocks,
  sessionId,
  onBlockUpdated,
}: {
  blocks: ScheduleBlock[];
  sessionId: string;
  onBlockUpdated: (blockId: string, updates: Partial<ScheduleBlock>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleToggleComplete = async (block: ScheduleBlock) => {
    try {
      onBlockUpdated(block.id, { completed: !block.completed });
      await updateBlock(sessionId, block.id, { completed: !block.completed });
    } catch (e) {
      console.error("Failed to toggle completion", e);
      // Revert on failure
      onBlockUpdated(block.id, { completed: block.completed });
    }
  };

  const handleEdit = (block: ScheduleBlock) => {
    setEditingId(block.id);
    setEditStart(toLocalInputValue(block.start_time));
    setEditEnd(toLocalInputValue(block.end_time));
  };

  const handleSave = async (block: ScheduleBlock) => {
    setSaving(true);
    try {
      const start_time = new Date(editStart).toISOString();
      const end_time = new Date(editEnd).toISOString();
      
      onBlockUpdated(block.id, { start_time, end_time });
      await updateBlock(sessionId, block.id, { start_time, end_time });
      setEditingId(null);
    } catch (e) {
      console.error("Failed to save times", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 mt-6">
      {blocks.map((block) => (
        <div 
          key={block.id} 
          className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
            block.completed ? 'bg-work/10 border-work/30' : 'bg-surface border-border'
          }`}
        >
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => handleToggleComplete(block)}
              className={`w-6 h-6 shrink-0 rounded border flex items-center justify-center transition-colors ${
                block.completed 
                  ? 'bg-work border-work text-bg' 
                  : 'border-muted/40 hover:border-work/60'
              }`}
            >
              {block.completed && <Check className="w-4 h-4" />}
            </button>
            
            <div className="flex-1">
              <div className={`font-medium text-sm ${block.completed ? 'text-ink/70 line-through' : 'text-ink'}`}>
                {block.task_title}
              </div>
              
              {editingId === block.id ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="datetime-local"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="bg-bg border border-border rounded px-2 py-1 text-xs text-ink outline-none focus:border-work"
                  />
                  <span className="text-muted text-xs">to</span>
                  <input
                    type="datetime-local"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="bg-bg border border-border rounded px-2 py-1 text-xs text-ink outline-none focus:border-work"
                  />
                </div>
              ) : (
                <div className="text-xs text-muted font-mono mt-1">
                  {formatTime(block.start_time)} — {formatTime(block.end_time)}
                </div>
              )}
            </div>
          </div>
          
          <div className="ml-4 shrink-0 flex gap-2">
            {editingId === block.id ? (
              <>
                <button 
                  onClick={() => handleSave(block)}
                  disabled={saving}
                  className="p-1.5 text-work hover:bg-work/10 rounded disabled:opacity-50"
                  aria-label="Save"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setEditingId(null)}
                  disabled={saving}
                  className="p-1.5 text-muted hover:bg-border/50 rounded disabled:opacity-50"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleEdit(block)}
                className="p-1.5 text-muted hover:text-ink hover:bg-border/50 rounded"
                aria-label="Edit time"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
