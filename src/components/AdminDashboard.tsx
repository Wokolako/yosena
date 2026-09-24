'use client';

import React, { useState, useEffect } from 'react';
import { Gemstone, PageView, BookingAppointment } from '../types';
import { fetchGemstones, fetchBookings, updateGemstoneStatus, adminFetchGemstones } from '../lib/api';
import { GemstoneManager } from './admin/GemstoneManager';
import { ContentManager } from './admin/ContentManager';
import {
  ShieldCheck,
  MessageSquare,
  Gem,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  ExternalLink,
  RefreshCw,
  Clock,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  Filter
} from 'lucide-react';

interface ChatLogEntry {
  id: string;
  timestamp: string;
  userMessage: string;
  botReply: string;
  handoff: boolean;
}

interface AdminDashboardProps {
  onNavigate: (page: PageView) => void;
  onSelectStone: (stone: Gemstone) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onSelectStone }) => {
  const [activeTab, setActiveTab] = useState<
    'chat-logs' | 'inventory' | 'manage' | 'content' | 'appointments' | 'analytics'
  >('chat-logs');
  const [chatLogs, setChatLogs] = useState<ChatLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [handoffOnly, setHandoffOnly] = useState<boolean>(false);
  const [gemstones, setGemstones] = useState<Gemstone[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<BookingAppointment[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Inventory and the appointment book are both desk-wide views, loaded once
  // when the dashboard mounts. Chat logs poll separately below.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [stones, bookings] = await Promise.all([fetchGemstones(), fetchBookings()]);
        if (!cancelled) {
          setGemstones(stones);
          setAppointments(bookings);
          setInventoryError(null);
        }
      } catch (err: any) {
        if (!cancelled) setInventoryError(err?.message ?? 'Could not load desk data.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/chat');

      if (res.ok) {
        const data = await res.json();
        if (data?.logs && Array.isArray(data.logs)) {
          setChatLogs(data.logs);
        }
        setLogsError(null);
      } else {
        // The transcript feed is desk-only now, so a refused poll means the
        // session lapsed. Saying so beats an empty list that reads as "no one
        // has asked us anything".
        const data = await res.json().catch(() => null);
        setLogsError(data?.error ?? 'Could not load the concierge transcripts.');
      }
    } catch (e) {
      console.error('Failed to load chat logs:', e);
      setLogsError('Could not reach the concierge log.');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const totalVaultValue = gemstones.reduce((sum, g) => sum + g.priceUSD, 0);
  const handoffCount = chatLogs.filter((l) => l.handoff).length;

  const filteredLogs = chatLogs.filter((log) => {
    const matchesSearch =
      log.userMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.botReply.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHandoff = handoffOnly ? log.handoff : true;
    return matchesSearch && matchesHandoff;
  });

  // Applied optimistically so the dropdown responds at once, then rolled back
  // if the desk rejects the move (an expired session, or a non-staff account).
  const reloadInventory = async () => {
    try {
      setGemstones(await adminFetchGemstones());
      setInventoryError(null);
    } catch (err: any) {
      setInventoryError(err?.message ?? 'Could not reload inventory.');
    }
  };

  const handleStatusChange = async (
    stoneId: string,
    newStatus: 'In Vault' | 'On Memo' | 'Reserved'
  ) => {
    const previous = gemstones;
    setGemstones((prev) =>
      prev.map((g) => (g.id === stoneId ? { ...g, status: newStatus } : g))
    );
    setInventoryError(null);

    try {
      await updateGemstoneStatus(stoneId, newStatus);
    } catch (err: any) {
      setGemstones(previous);
      setInventoryError(err?.message ?? 'Could not update that stone.');
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1918] dark:text-[#F5F2ED] min-h-screen transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Dashboard Header */}
        <div className="bg-[#FFFFFF] dark:bg-[#181614] p-6 sm:p-8 rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94] mb-1">
              <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
              <span>YosenaMora Atelier Trade Desk</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">
              Admin &amp; Operations Control Center
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] mt-1 font-light">
              Hatton Garden (London) &amp; Rue du Rhône (Genève) Vault Systems
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1.5 rounded-full bg-[#E8F5E9] dark:bg-[#1B3320] text-[#2E7D32] dark:text-[#81C784] text-xs font-bold flex items-center gap-1.5 border border-[#C8E6C9] dark:border-[#2E5235]">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] dark:bg-[#81C784] animate-pulse" />
              Desk Live
            </span>

            <button
              onClick={fetchLogs}
              disabled={isLoadingLogs}
              className="p-2.5 rounded-lg border border-[#E0D8CE] dark:border-[#332F2B] bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1918] dark:text-[#F5F2ED] hover:bg-[#E8E1D9] dark:hover:bg-[#23201D] transition-colors cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-xl bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8C827A] dark:text-[#A69C94]">
              <span className="text-xs uppercase font-bold tracking-wider">Total Vault Value</span>
              <DollarSign className="w-5 h-5 text-[#C5A880]" />
            </div>
            <p className="font-serif text-3xl font-semibold text-[#1A1918] dark:text-[#F5F2ED]">
              ${totalVaultValue.toLocaleString()}
            </p>
            <p className="text-xs text-[#78716C] dark:text-[#A69C94] flex items-center gap-1">
              <Gem className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{gemstones.length} certified vault stones listed</span>
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8C827A] dark:text-[#A69C94]">
              <span className="text-xs uppercase font-bold tracking-wider">Concierge Inquiries</span>
              <MessageSquare className="w-5 h-5 text-[#C5A880]" />
            </div>
            <p className="font-serif text-3xl font-semibold text-[#1A1918] dark:text-[#F5F2ED]">
              {chatLogs.length}
            </p>
            <p className="text-xs text-[#78716C] dark:text-[#A69C94] flex items-center gap-1">
              <span>Recorded AI concierge turns</span>
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8C827A] dark:text-[#A69C94]">
              <span className="text-xs uppercase font-bold tracking-wider">Desk Handoff Leads</span>
              <PhoneCall className="w-5 h-5 text-[#25D366]" />
            </div>
            <p className="font-serif text-3xl font-semibold text-[#1A1918] dark:text-[#F5F2ED]">
              {handoffCount}
            </p>
            <p className="text-xs text-[#25D366] font-medium flex items-center gap-1">
              <span>High-intent WhatsApp requests</span>
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[#8C827A] dark:text-[#A69C94]">
              <span className="text-xs uppercase font-bold tracking-wider">Private Appointments</span>
              <Calendar className="w-5 h-5 text-[#C5A880]" />
            </div>
            <p className="font-serif text-3xl font-semibold text-[#1A1918] dark:text-[#F5F2ED]">
              {appointments.length}
            </p>
            <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
              Upcoming London &amp; Geneva viewings
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-[#E8E1D9] dark:border-[#262320] flex space-x-6 text-xs sm:text-sm font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('chat-logs')}
            className={`pb-3.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'chat-logs'
                ? 'border-[#1A1918] dark:border-[#C5A880] text-[#1A1918] dark:text-[#F5F2ED]'
                : 'border-transparent text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            Concierge Chat Logs ({chatLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-3.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-[#1A1918] dark:border-[#C5A880] text-[#1A1918] dark:text-[#F5F2ED]'
                : 'border-transparent text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            Vault Inventory ({gemstones.length})
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-3.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'manage'
                ? 'border-[#1A1918] dark:border-[#C5A880] text-[#1A1918] dark:text-[#F5F2ED]'
                : 'border-transparent text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            Manage Stones
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-3.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'content'
                ? 'border-[#1A1918] dark:border-[#C5A880] text-[#1A1918] dark:text-[#F5F2ED]'
                : 'border-transparent text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            Site Content
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-3.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'appointments'
                ? 'border-[#1A1918] dark:border-[#C5A880] text-[#1A1918] dark:text-[#F5F2ED]'
                : 'border-transparent text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            Appointments &amp; Bookings ({appointments.length})
          </button>
        </div>

        {/* Tab 1: Concierge Chat Logs */}
        {activeTab === 'chat-logs' && (
          <div className="bg-[#FFFFFF] dark:bg-[#181614] rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#8C827A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search visitor query or assistant reply…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded-lg text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880]"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#57534E] dark:text-[#D5CDC4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handoffOnly}
                    onChange={(e) => setHandoffOnly(e.target.checked)}
                    className="rounded border-[#E0D8CE] dark:border-[#332F2B] text-[#1A1918] focus:ring-0 cursor-pointer"
                  />
                  <span>WhatsApp Desk Handoffs Only ({handoffCount})</span>
                </label>
              </div>
            </div>

            {logsError ? (
              <div
                role="alert"
                className="py-12 text-center text-xs sm:text-sm font-semibold text-[#A3524A] dark:text-[#E0897F] border border-dashed border-[#E9C9C4] dark:border-[#4A2622] rounded-lg p-6"
              >
                {logsError}
              </div>
            ) : isLoadingLogs && chatLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#78716C] dark:text-[#A69C94] animate-pulse">
                Loading live chat logs from vault desk server…
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] border border-dashed border-[#E8E1D9] dark:border-[#262320] rounded-lg p-6">
                No chat logs match your current filter criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-5 rounded-lg border transition-all ${
                      log.handoff
                        ? 'bg-[#FFFDF7] dark:bg-[#1C1814] border-[#C5A880] ring-1 ring-[#C5A880]/30'
                        : 'bg-[#FAF8F5] dark:bg-[#121110] border-[#E8E1D9] dark:border-[#262320]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#8C827A] dark:text-[#A69C94] pb-3 border-b border-[#E8E1D9] dark:border-[#262320] mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.handoff && (
                        <span className="px-2.5 py-0.5 rounded bg-[#25D366]/15 text-[#25D366] font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 border border-[#25D366]/30">
                          <PhoneCall className="w-3 h-3" /> WhatsApp Handoff Triggered
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 text-xs sm:text-sm">
                      <div className="bg-[#FFFFFF] dark:bg-[#181614] p-3.5 rounded border border-[#E8E1D9] dark:border-[#262320]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block mb-1">
                          Visitor Query:
                        </span>
                        <p className="text-[#1A1918] dark:text-[#F5F2ED] font-medium leading-relaxed">
                          "{log.userMessage}"
                        </p>
                      </div>

                      <div className="bg-[#FAF8F5] dark:bg-[#141312] p-3.5 rounded border border-[#E8E1D9] dark:border-[#23201D]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880] block mb-1">
                          Concierge Response:
                        </span>
                        <p className="text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed whitespace-pre-wrap">
                          {log.botReply}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vault Inventory Ledger */}
        {activeTab === 'inventory' && (
          <div className="bg-[#FFFFFF] dark:bg-[#181614] rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm p-6 space-y-6">
            {inventoryError && (
              <p role="alert" className="text-xs sm:text-sm font-semibold text-[#A3524A] dark:text-[#E0897F]">
                {inventoryError}
              </p>
            )}

            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#1A1918] dark:text-[#F5F2ED]">
                Vault Gemstone Inventory &amp; Status Controls
              </h3>
              <span className="text-xs uppercase font-bold text-[#8C827A] dark:text-[#A69C94]">
                {gemstones.length} Stones Managed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E8E1D9] dark:border-[#262320] text-[#8C827A] dark:text-[#A69C94] uppercase tracking-wider text-[11px] font-bold bg-[#FAF8F5] dark:bg-[#121110]">
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Carat</th>
                    <th className="py-3 px-4">Cert / Origin</th>
                    <th className="py-3 px-4">Price (USD)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E1D9] dark:divide-[#262320]">
                  {gemstones.map((stone) => (
                    <tr key={stone.id} className="hover:bg-[#FAF8F5] dark:hover:bg-[#141312] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={stone.image}
                            alt={stone.name}
                            className="w-10 h-10 rounded object-cover border border-[#E0D8CE] dark:border-[#332F2B]"
                          />
                          <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] line-clamp-1">
                            {stone.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#57534E] dark:text-[#D5CDC4]">
                        {stone.category}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                        {stone.carat} ct
                      </td>
                      <td className="py-3.5 px-4 text-[#57534E] dark:text-[#D5CDC4]">
                        {stone.certification} ({stone.certNumber})
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                        ${stone.priceUSD.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={stone.status}
                          onChange={(e) => handleStatusChange(stone.id, e.target.value as any)}
                          className="bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-2.5 py-1 text-xs font-bold text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none cursor-pointer"
                        >
                          <option value="In Vault">In Vault</option>
                          <option value="On Memo">On Memo</option>
                          <option value="Reserved">Reserved</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectStone(stone)}
                          className="text-xs uppercase tracking-wider text-[#C5A880] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] font-bold underline cursor-pointer"
                        >
                          Inspect Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Appointments */}
        {activeTab === 'manage' && (
          <div className="bg-[#FFFFFF] dark:bg-[#181614] rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm p-6">
            <GemstoneManager gemstones={gemstones} onChanged={reloadInventory} />
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-[#FFFFFF] dark:bg-[#181614] rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm p-6">
            <ContentManager />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-[#FFFFFF] dark:bg-[#181614] rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl text-[#1A1918] dark:text-[#F5F2ED]">
                Scheduled Private Jeweller Appointments
              </h3>
              <span className="text-xs uppercase font-bold text-[#8C827A] dark:text-[#A69C94]">
                London &amp; Geneva Suites
              </span>
            </div>

            <div className="space-y-4">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 rounded-lg bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E1D9] dark:border-[#262320] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#8C827A] dark:text-[#A69C94]">
                      <span className="font-mono font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                        {apt.referenceNumber}
                      </span>
                      <span>•</span>
                      <span>{apt.date} at {apt.time}</span>
                    </div>
                    <h4 className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED] font-semibold">
                      {apt.serviceTitle}
                    </h4>
                    <p className="text-xs text-[#57534E] dark:text-[#D5CDC4] flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span className="font-bold">{apt.clientName}</span> ({apt.companyName})
                    </p>
                    <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                      Contact: {apt.email} | {apt.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-3 py-1 rounded bg-[#E8F5E9] dark:bg-[#1B3320] text-[#2E7D32] dark:text-[#81C784] text-xs font-bold uppercase tracking-wider border border-[#C8E6C9] dark:border-[#2E5235]">
                      {apt.status}
                    </span>
                    <a
                      href={`mailto:${apt.email}?subject=Confirmation for YosenaMora Appointment ${apt.referenceNumber}`}
                      className="px-3 py-1.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded text-xs font-bold uppercase tracking-wider hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors"
                    >
                      Email Client
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
