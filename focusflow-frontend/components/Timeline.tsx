'use client';

import { ScheduleBlock } from '@/lib/api';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Timeline({
  blocks,
  daySpanMinutes,
}: {
  blocks: ScheduleBlock[];
  daySpanMinutes: number;
}) {
  if (blocks.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex w-full h-14 rounded-md overflow-hidden border border-border">
        {blocks.map((block, i) => {
          const durationMin =
            (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60000;
          const widthPct = Math.max((durationMin / daySpanMinutes) * 100, 1.5);
          const bg = block.is_break ? 'bg-rest/30' : block.completed ? 'bg-work/40' : 'bg-work';
          return (
            <div
              key={i}
              title={`${block.task_title} — ${formatTime(block.start_time)} to ${formatTime(block.end_time)}`}
              style={{ width: `${widthPct}%` }}
              className={`h-full ${bg} border-r border-bg/40 last:border-r-0 transition-opacity`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 font-mono text-xs text-muted">
        <span>{formatTime(blocks[0].start_time)}</span>
        <span>{formatTime(blocks[blocks.length - 1].end_time)}</span>
      </div>
    </div>
  );
}
