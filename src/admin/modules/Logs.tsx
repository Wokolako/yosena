'use client';

import React, { useMemo, useState } from 'react';
import { Panel, useResource, Button, Pill, fmtDate, inputCls, Loading, Notice, Empty } from '../ui';

interface ChatLog {
  id: string;
  timestamp: string;
  userMessage: string;
  botReply: string;
  handoff: boolean;
}

interface AuditEntry {
  id: string;
  at: string;
  actorEmail: string;
  action: string;
  target: string;
  details?: Record<string, unknown>;
}

export const LogsModule: React.FC = () => {
  const [view, setView] = useState<'chat' | 'audit'>('chat');
  return (
    <>
      <div className="flex gap-2">
        <Button variant={view === 'chat' ? 'primary' : 'secondary'} onClick={() => setView('chat')}>Concierge conversations</Button>
        <Button variant={view === 'audit' ? 'primary' : 'secondary'} onClick={() => setView('audit')}>Admin audit log</Button>
      </div>
      {view === 'chat' ? <ChatLogs /> : <AuditLog />}
    </>
  );
};

const ChatLogs: React.FC = () => {
  const { data: logs, error, loading, reload } = useResource<ChatLog[]>('/api/admin/chat-logs');
  const [search, setSearch] = useState('');
  const [handoffOnly, setHandoffOnly] = useState(false);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return (logs ?? []).filter(
      (l) => (!handoffOnly || l.handoff) && (!q || l.userMessage.toLowerCase().includes(q) || l.botReply.toLowerCase().includes(q))
    );
  }, [logs, search, handoffOnly]);

  if (loading && !logs) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <Panel
      title={`Concierge conversations (${visible.length})`}
      actions={
        <>
          <input className={`${inputCls} w-64`} placeholder="Search messages…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="text-xs flex items-center gap-1.5">
            <input type="checkbox" checked={handoffOnly} onChange={(e) => setHandoffOnly(e.target.checked)} /> WhatsApp hand-offs only
          </label>
          <Button onClick={() => void reload()} busy={loading}>Refresh</Button>
        </>
      }
    >
      {visible.length === 0 ? <Empty>No conversations match.</Empty> : (
        <div className="space-y-3">
          {visible.map((l) => (
            <div key={l.id} className={`rounded-lg border p-4 text-sm space-y-2 ${l.handoff ? 'border-[#C5A880]' : 'border-[#E8E1D9] dark:border-[#262320]'}`}>
              <div className="flex items-center justify-between text-xs text-[#78716C] dark:text-[#A69C94]">
                <span>{fmtDate(l.timestamp, true)}</span>
                {l.handoff && <Pill tone="good">WhatsApp hand-off</Pill>}
              </div>
              <p><span className="text-xs font-bold uppercase text-[#8C827A]">Visitor:</span> {l.userMessage}</p>
              <p className="whitespace-pre-wrap text-[#57534E] dark:text-[#D5CDC4]"><span className="text-xs font-bold uppercase text-[#C5A880]">Concierge:</span> {l.botReply}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
};

const AuditLog: React.FC = () => {
  const { data: entries, error, loading, reload } = useResource<AuditEntry[]>('/api/admin/audit');

  if (loading && !entries) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <Panel title="Admin audit log" actions={<Button onClick={() => void reload()} busy={loading}>Refresh</Button>}>
      {!entries || entries.length === 0 ? <Empty>No admin changes recorded yet.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] border-b border-[#E8E1D9] dark:border-[#262320]">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Who</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E1D9] dark:divide-[#262320]">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">{fmtDate(e.at, true)}</td>
                  <td className="py-2 pr-3 text-xs">{e.actorEmail}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{e.action}</td>
                  <td className="py-2 text-xs">{e.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};
