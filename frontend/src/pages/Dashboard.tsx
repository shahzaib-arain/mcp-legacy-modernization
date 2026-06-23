import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users, UserPlus, Trash2, Search, Edit2, LogOut, ShieldAlert,
  RefreshCw, X, AlertCircle, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, ShieldCheck, ClipboardList,
  BadgeCheck, Eye, Fingerprint, Send
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CitizenRecord {
  id: number;
  nic: string;
  name: string;
  fatherNic: string;
  motherName: string;
  birthCertificate: string;
  residentForm: string;
  maritalStatus: string;
  createdAt: string;
  isVerified: boolean;
  verifiedByManager?: string;
  verifiedByAdmin?: string;
}

interface VerificationRequest {
  id: string;
  name: string;
  fatherNic: string;
  motherName: string;
  birthCertificate: string;
  residentForm: string;
  maritalStatus: string;
  age: number;
  status: 'PENDING_MANAGER' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
  nic?: string;
  createdAt: string;
  user?: { name: string; username?: string };
  manager?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    PENDING_MANAGER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    PENDING_ADMIN:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    APPROVED:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    REJECTED:        'bg-red-500/10 text-red-400 border-red-500/20',
    married:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    single:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    divorced: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    widowed:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return map[status] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    PENDING_MANAGER: 'Awaiting Manager',
    PENDING_ADMIN:   'Awaiting Admin',
    APPROVED:        'Approved',
    REJECTED:        'Rejected',
  };
  return map[status] ?? status;
};

const statusIcon = (status: string) => {
  if (status === 'APPROVED') return <CheckCircle className="h-3.5 w-3.5" />;
  if (status === 'REJECTED') return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
};

// ─── Form Field ───────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
    {children}
  </label>
);

const inp = "w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition";

// ─── Modal Wrapper ────────────────────────────────────────────────────────────
const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode; width?: string }> = ({
  onClose, title, children, width = 'max-w-lg'
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className={`w-full ${width} rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl`}>
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-white transition">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const ErrorBanner: React.FC<{ msg: string | null }> = ({ msg }) =>
  msg ? (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />{msg}
    </div>
  ) : null;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  if (user.role === 'ADMIN')    return <AdminDashboard />;
  if (user.role === 'MANAGER')  return <ManagerDashboard />;
  return <UserDashboard />;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED NAV
// ═══════════════════════════════════════════════════════════════════════════════
const Nav: React.FC<{
  title: string;
  subtitle: string;
  badgeColor: string;
  badgeLabel: string;
  onRefresh: () => void;
}> = ({ title, subtitle, badgeColor, badgeLabel, onRefresh }) => {
  const { user, logout } = useAuth();
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeColor}`}>{badgeLabel}</span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Signed in as <span className="font-semibold text-white">{user?.name}</span>
          <span className="ml-2 text-slate-600">@{user?.username}</span>
        </p>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          aria-label="Refresh list"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-600/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-600/20 transition"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </header>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const UserDashboard: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [form, setForm] = useState({
    name: '', fatherNic: '', motherName: '',
    birthCertificate: '', residentForm: '', maritalStatus: 'single', age: 18,
  });

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests');
      if (res.status === 'success') setRequests(res.data.requests);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setActionLoading(true);
    try {
      const res = await api.post('/requests', form);
      if (res.status === 'success') {
        setIsApplyOpen(false);
        fetchRequests();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit application.');
    } finally { setActionLoading(false); }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_ADMIN').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <Nav
        title="NIC Application Portal"
        subtitle="Submit and track your NIC card applications"
        badgeColor="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
        badgeLabel="Citizen"
        onRefresh={fetchRequests}
      />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Applications', value: requests.length, color: 'text-white', icon: <ClipboardList className="h-5 w-5 text-slate-400" /> },
          { label: 'In Progress', value: pendingCount, color: 'text-amber-400', icon: <Clock className="h-5 w-5 text-amber-500" /> },
          { label: 'Approved', value: approvedCount, color: 'text-emerald-400', icon: <BadgeCheck className="h-5 w-5 text-emerald-500" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">{s.label}</span>
              {s.icon}
            </div>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">My Applications</h2>
        <button
          id="apply-nic-btn"
          onClick={() => { setForm({ name: '', fatherNic: '', motherName: '', birthCertificate: '', residentForm: '', maritalStatus: 'single', age: 18 }); setModalError(null); setIsApplyOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-400 transition"
        >
          <UserPlus className="h-4 w-4" /> Apply for NIC Card
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="mt-3 text-xs text-slate-500">Loading applications...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList className="h-12 w-12 text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">No applications yet.</p>
            <p className="text-slate-600 text-xs mt-1">Click "Apply for NIC Card" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Applicant Name</th>
                  <th className="px-6 py-4">NIC (Assigned)</th>
                  <th className="px-6 py-4">Marital Status</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/10 transition">
                    <td className="px-6 py-4 font-medium text-white">{req.name}</td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {req.nic ? (
                        <span className="text-emerald-400">{req.nic}</span>
                      ) : (
                        <span className="text-slate-600 italic">Pending assignment</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(req.maritalStatus)}`}>
                        {req.maritalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge(req.status)}`}>
                        {statusIcon(req.status)}{statusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="flex items-center gap-1 ml-auto rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {isApplyOpen && (
        <Modal title="Apply for NIC Card" onClose={() => setIsApplyOpen(false)}>
          <ErrorBanner msg={modalError} />
          <form onSubmit={handleApply} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full Name">
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} placeholder="Your full name" />
              </Field>
              <Field label="Age">
                <input type="number" required min={18} value={form.age} onChange={e => setForm({ ...form, age: parseInt(e.target.value) || 0 })} className={inp} />
              </Field>
            </div>
            <Field label="Father / Relative NIC">
              <input type="text" required value={form.fatherNic} onChange={e => setForm({ ...form, fatherNic: e.target.value })} className={inp} placeholder="e.g. 35202-1234567-1" />
            </Field>
            <Field label="Mother's Name">
              <input type="text" required value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })} className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Birth Certificate No.">
                <input type="text" required value={form.birthCertificate} onChange={e => setForm({ ...form, birthCertificate: e.target.value })} className={inp} placeholder="BC-XXXXXXXX" />
              </Field>
              <Field label="Resident Form No.">
                <input type="text" required value={form.residentForm} onChange={e => setForm({ ...form, residentForm: e.target.value })} className={inp} />
              </Field>
            </div>
            <Field label="Marital Status">
              <select value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })} className={inp}>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </Field>
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
              ⚠ NIC will be auto-generated and assigned by an Administrator upon approval.
            </p>
            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button type="button" onClick={() => setIsApplyOpen(false)} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
                Cancel
              </button>
              <button type="submit" disabled={actionLoading} id="submit-application-btn" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50">
                <Send className="h-4 w-4" /> {actionLoading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {selectedRequest && (
        <Modal title="Application Details" onClose={() => setSelectedRequest(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Name', selectedRequest.name],
                ['Age', selectedRequest.age],
                ['Father NIC', selectedRequest.fatherNic],
                ['Mother Name', selectedRequest.motherName],
                ['Birth Certificate', selectedRequest.birthCertificate],
                ['Resident Form', selectedRequest.residentForm],
                ['Marital Status', selectedRequest.maritalStatus],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                  <p className="font-medium text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-slate-500 mb-0.5">Status</p>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge(selectedRequest.status)}`}>
                {statusIcon(selectedRequest.status)}{statusLabel(selectedRequest.status)}
              </span>
            </div>
            {selectedRequest.nic && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-500/70 mb-0.5">Assigned NIC</p>
                <p className="font-mono text-lg font-bold text-emerald-400">{selectedRequest.nic}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const ManagerDashboard: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'reject'>('view');
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/requests');
      if (res.status === 'success') setRequests(res.data.requests);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleVerify = async (id: string) => {
    setActionLoading(true);
    try {
      await api.put(`/requests/${id}/verify-manager`, {});
      setSelectedReq(null);
      fetchRequests();
    } catch (err: any) {
      setModalError(err.message || 'Failed to verify request.');
    } finally { setActionLoading(false); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      await api.put(`/requests/${id}/reject`, {});
      setSelectedReq(null);
      fetchRequests();
    } catch (err: any) {
      setModalError(err.message || 'Failed to reject request.');
    } finally { setActionLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <Nav
        title="Verification Queue"
        subtitle="Review and forward citizen NIC applications to Admin"
        badgeColor="bg-amber-500/10 text-amber-400 border-amber-500/20"
        badgeLabel="Manager"
        onRefresh={fetchRequests}
      />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Pending Review</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-400">{requests.length}</p>
          <p className="mt-1 text-xs text-slate-500">Applications awaiting your verification</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Your Role</span>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-lg font-bold text-white">Verification Manager</p>
          <p className="mt-1 text-xs text-slate-500">Review applications, forward approved ones to Admin</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-white">Citizen Applications</h2>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-400">{requests.length} Pending</span>
        </div>
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="mt-3 text-xs text-slate-500">Loading queue...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <CheckCircle className="h-12 w-12 text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">All clear! No pending applications.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Applicant</th>
                  <th className="px-6 py-4">Submitted By</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Marital Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/10 transition">
                    <td className="px-6 py-4 font-medium text-white">{req.name}</td>
                    <td className="px-6 py-4 text-slate-400">{req.user?.name ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-300">{req.age}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(req.maritalStatus)}`}>
                        {req.maritalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setSelectedReq(req); setModalMode('view'); setModalError(null); }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReq && (
        <Modal title="Review Application" onClose={() => setSelectedReq(null)} width="max-w-xl">
          <ErrorBanner msg={modalError} />
          <div className="space-y-3 text-sm mb-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Full Name', selectedReq.name],
                ['Age', selectedReq.age],
                ['Father NIC', selectedReq.fatherNic],
                ['Mother Name', selectedReq.motherName],
                ['Birth Certificate', selectedReq.birthCertificate],
                ['Resident Form', selectedReq.residentForm],
                ['Marital Status', selectedReq.maritalStatus],
                ['Submitted By', selectedReq.user?.name ?? '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                  <p className="font-medium text-white">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-cyan-400">
            Verifying will forward this application to the Admin for final NIC assignment and approval.
          </p>
          <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              onClick={() => handleReject(selectedReq.id)}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-600/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-600/20 transition disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
            <button
              onClick={() => handleVerify(selectedReq.id)}
              disabled={actionLoading}
              id="verify-forward-btn"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {actionLoading ? 'Processing...' : 'Verify & Forward to Admin'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registry' | 'approvals'>('registry');

  // ── Registry state ──────────────────────────────────────────────────────────
  const [records, setRecords] = useState<CitizenRecord[]>([]);
  const [stats, setStats] = useState<{ total: number; breakdown: Record<string, number> }>({ total: 0, breakdown: {} });
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [editingNic, setEditingNic] = useState<string | null>(null);
  const [deletingNic, setDeletingNic] = useState<string | null>(null);
  const [bulkKeyword, setBulkKeyword] = useState('');
  const [recordForm, setRecordForm] = useState({
    name: '', nic: '', fatherNic: '', motherName: '',
    birthCertificate: '', residentForm: '', maritalStatus: 'single', age: 18,
  });

  // ── Approvals state ─────────────────────────────────────────────────────────
  const [pendingRequests, setPendingRequests] = useState<VerificationRequest[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<VerificationRequest | null>(null);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);

  // ── Shared ───────────────────────────────────────────────────────────────────
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 10;

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const [recRes, statRes] = await Promise.all([
        api.get(`/records?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
        api.get('/records/stats'),
      ]);
      if (recRes.status === 'success') {
        setRecords(recRes.data.records);
        setTotalPages(recRes.data.pagination.totalPages);
      }
      if (statRes.status === 'success') setStats(statRes.data);
    } catch { } finally { setRecordsLoading(false); }
  }, [page, search]);

  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    try {
      const res = await api.get('/requests');
      if (res.status === 'success') setPendingRequests(res.data.requests);
    } catch { } finally { setApprovalsLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleApprove = async (req: VerificationRequest) => {
    setActionLoading(true);
    setModalError(null);
    try {
      await api.put(`/requests/${req.id}/verify-admin`, {});
      setIsApproveConfirmOpen(false);
      setSelectedApproval(null);
      fetchApprovals();
      fetchRecords();
    } catch (err: any) {
      setModalError(err.message || 'Approval failed.');
    } finally { setActionLoading(false); }
  };

  const handleRejectApproval = async (id: string) => {
    setActionLoading(true);
    setModalError(null);
    try {
      await api.put(`/requests/${id}/reject`, {});
      setSelectedApproval(null);
      fetchApprovals();
    } catch (err: any) {
      setModalError(err.message || 'Rejection failed.');
    } finally { setActionLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setActionLoading(true);
    try {
      const res = await api.post('/records', recordForm);
      if (res.status === 'success') { setIsCreateOpen(false); fetchRecords(); }
    } catch (err: any) { setModalError(err.message || 'Failed to create record.'); }
    finally { setActionLoading(false); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setActionLoading(true);
    try {
      const res = await api.put(`/records/${editingNic}`, recordForm);
      if (res.status === 'success') { setIsEditOpen(false); fetchRecords(); }
    } catch (err: any) { setModalError(err.message || 'Failed to update record.'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/records/${deletingNic}`);
      setIsDeleteOpen(false);
      if (records.length === 1 && page > 1) setPage(page - 1);
      else fetchRecords();
    } catch (err: any) { setModalError(err.message || 'Delete failed.'); }
    finally { setActionLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (bulkKeyword !== 'DELETE ALL') { setModalError('Type "DELETE ALL" to confirm.'); return; }
    setActionLoading(true);
    try {
      await api.delete('/records');
      setIsBulkDeleteOpen(false);
      setPage(1);
      fetchRecords();
    } catch (err: any) { setModalError(err.message || 'Bulk delete failed.'); }
    finally { setActionLoading(false); }
  };

  const openEdit = (r: CitizenRecord) => {
    setRecordForm({ name: r.name, nic: r.nic, fatherNic: r.fatherNic, motherName: r.motherName, birthCertificate: r.birthCertificate, residentForm: r.residentForm, maritalStatus: r.maritalStatus, age: 18 });
    setEditingNic(r.nic);
    setModalError(null);
    setIsEditOpen(true);
  };

  const married = stats.breakdown?.married || 0;
  const single  = stats.breakdown?.single  || 0;
  const divorced = stats.breakdown?.divorced || 0;
  const widowed = stats.breakdown?.widowed  || 0;

  const RecordForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <ErrorBanner msg={modalError} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full Name"><input type="text" required value={recordForm.name} onChange={e => setRecordForm({ ...recordForm, name: e.target.value })} className={inp} /></Field>
        <Field label="NIC Number"><input type="text" required value={recordForm.nic} onChange={e => setRecordForm({ ...recordForm, nic: e.target.value })} className={inp} /></Field>
        <Field label="Father NIC"><input type="text" required value={recordForm.fatherNic} onChange={e => setRecordForm({ ...recordForm, fatherNic: e.target.value })} className={inp} /></Field>
        <Field label="Mother Name"><input type="text" required value={recordForm.motherName} onChange={e => setRecordForm({ ...recordForm, motherName: e.target.value })} className={inp} /></Field>
        <Field label="Birth Certificate"><input type="text" required value={recordForm.birthCertificate} onChange={e => setRecordForm({ ...recordForm, birthCertificate: e.target.value })} className={inp} /></Field>
        <Field label="Resident Form"><input type="text" required value={recordForm.residentForm} onChange={e => setRecordForm({ ...recordForm, residentForm: e.target.value })} className={inp} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Marital Status">
          <select value={recordForm.maritalStatus} onChange={e => setRecordForm({ ...recordForm, maritalStatus: e.target.value })} className={inp}>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="divorced">Divorced</option>
            <option value="widowed">Widowed</option>
          </select>
        </Field>
        <Field label="Age">
          <input type="number" min={18} required value={recordForm.age} onChange={e => setRecordForm({ ...recordForm, age: parseInt(e.target.value) || 0 })} className={inp} />
        </Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <button type="button" onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">Cancel</button>
        <button type="submit" disabled={actionLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50">{actionLoading ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <Nav
        title="NADRA Admin Panel"
        subtitle="Manage citizen records and approve verification requests"
        badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        badgeLabel="Admin"
        onRefresh={() => { fetchRecords(); fetchApprovals(); }}
      />

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total Citizens', value: stats.total, color: 'text-white', icon: <Users className="h-5 w-5 text-slate-400" /> },
          { label: 'Married', value: married, color: 'text-emerald-400', icon: <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> },
          { label: 'Single', value: single, color: 'text-cyan-400', icon: <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" /> },
          { label: 'Divorced / Widowed', value: divorced + widowed, color: 'text-orange-400', icon: <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" /> },
          { label: 'Pending Approvals', value: pendingRequests.length, color: 'text-amber-400', icon: <Clock className="h-5 w-5 text-amber-400" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{s.label}</span>
              {s.icon}
            </div>
            <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl border border-slate-800 bg-slate-900/60 p-1 max-w-sm">
        <button
          onClick={() => setActiveTab('registry')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'registry' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          <Users className="h-4 w-4" /> Citizen Registry
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          id="approvals-tab"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${activeTab === 'approvals' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          <ClipboardList className="h-4 w-4" /> Manager Requests
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white leading-none">{pendingRequests.length}</span>
          )}
        </button>
      </div>

      {/* ── REGISTRY TAB ── */}
      {activeTab === 'registry' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name, NIC, parents..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRecordForm({ name: '', nic: '', fatherNic: '', motherName: '', birthCertificate: '', residentForm: '', maritalStatus: 'single', age: 18 }); setModalError(null); setIsCreateOpen(true); }}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition">
                <UserPlus className="h-4 w-4" /> Register Citizen
              </button>
              <button onClick={() => { setBulkKeyword(''); setModalError(null); setIsBulkDeleteOpen(true); }}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/30 transition">
                <Trash2 className="h-4 w-4" /> Purge
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="border-b border-slate-800/50 bg-slate-950/30 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">NIC</th>
                  <th className="px-5 py-4">Father NIC</th>
                  <th className="px-5 py-4">Marital Status</th>
                  <th className="px-5 py-4">Verification</th>
                  <th className="px-5 py-4">Verified By</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {recordsLoading ? (
                  <tr><td colSpan={7} className="py-20 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span className="mt-2 block text-xs text-slate-500">Loading registry...</span>
                  </td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-slate-500">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-600" />
                    No records found.
                  </td></tr>
                ) : records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/10 transition">
                    <td className="px-5 py-4 font-medium text-white">{rec.name}</td>
                    <td className="px-5 py-4 font-mono text-emerald-400 text-xs">{rec.nic}</td>
                    <td className="px-5 py-4 font-mono text-slate-400 text-xs">{rec.fatherNic}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(rec.maritalStatus)}`}>{rec.maritalStatus}</span>
                    </td>
                    <td className="px-5 py-4">
                      {rec.isVerified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                          <Fingerprint className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-xs font-semibold text-slate-500">
                          Legacy
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {rec.verifiedByManager ? (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> {rec.verifiedByManager}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(rec)} aria-label="Edit record" className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { setDeletingNic(rec.nic); setModalError(null); setIsDeleteOpen(true); }} aria-label="Delete record" className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/20 text-red-400 hover:bg-red-900/30 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!recordsLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
              <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── APPROVALS TAB ── */}
      {activeTab === 'approvals' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
            <h2 className="font-bold text-white">Manager-Verified Requests</h2>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-400">{pendingRequests.length} Awaiting Admin</span>
          </div>

          {approvalsLoading ? (
            <div className="flex flex-col items-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="mt-3 text-xs text-slate-500">Loading...</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <BadgeCheck className="h-12 w-12 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">No pending approvals. All requests are handled.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/40 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Applicant</th>
                    <th className="px-6 py-4">Submitted By</th>
                    <th className="px-6 py-4">Verified By Manager</th>
                    <th className="px-6 py-4">Age</th>
                    <th className="px-6 py-4">Marital</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {pendingRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/10 transition">
                      <td className="px-6 py-4 font-medium text-white">{req.name}</td>
                      <td className="px-6 py-4 text-slate-400">{req.user?.name ?? '—'}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
                          <ShieldCheck className="h-3.5 w-3.5" /> {req.manager?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{req.age}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(req.maritalStatus)}`}>{req.maritalStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setSelectedApproval(req); setModalError(null); setIsApproveConfirmOpen(false); }}
                            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Create */}
      {isCreateOpen && (
        <Modal title="Register New Citizen" onClose={() => setIsCreateOpen(false)}>
          <RecordForm onSubmit={handleCreate} submitLabel="Create Record" />
        </Modal>
      )}

      {/* Edit */}
      {isEditOpen && (
        <Modal title="Modify Citizen Profile" onClose={() => setIsEditOpen(false)}>
          <RecordForm onSubmit={handleEdit} submitLabel="Save Changes" />
        </Modal>
      )}

      {/* Single Delete */}
      {isDeleteOpen && (
        <Modal title="Delete Citizen Record?" onClose={() => setIsDeleteOpen(false)} width="max-w-md">
          <div className="flex items-center gap-3 mb-4 text-red-400">
            <ShieldAlert className="h-7 w-7 shrink-0" />
            <p className="text-sm text-slate-400">Are you sure you want to permanently delete NIC <span className="font-mono text-white">{deletingNic}</span>? This cannot be undone.</p>
          </div>
          <ErrorBanner msg={modalError} />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            <button onClick={handleDelete} disabled={actionLoading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 transition disabled:opacity-50">
              {actionLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      {/* Bulk Delete */}
      {isBulkDeleteOpen && (
        <Modal title="Purge National Registry?" onClose={() => setIsBulkDeleteOpen(false)} width="max-w-md">
          <div className="flex items-center gap-3 mb-3 text-red-400">
            <ShieldAlert className="h-7 w-7 shrink-0" />
            <p className="text-sm text-slate-400">This will wipe ALL citizen records. Type <span className="font-mono font-bold text-white">DELETE ALL</span> to confirm.</p>
          </div>
          <input type="text" value={bulkKeyword} onChange={e => setBulkKeyword(e.target.value)} placeholder='Type "DELETE ALL"' className={`${inp} mt-2 font-mono`} />
          <ErrorBanner msg={modalError} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
            <button onClick={() => setIsBulkDeleteOpen(false)} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">Cancel</button>
            <button onClick={handleBulkDelete} disabled={actionLoading || bulkKeyword !== 'DELETE ALL'}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 transition disabled:opacity-50">
              {actionLoading ? 'Purging...' : 'Purge All'}
            </button>
          </div>
        </Modal>
      )}

      {/* Approval Review */}
      {selectedApproval && !isApproveConfirmOpen && (
        <Modal title="Review Approval Request" onClose={() => setSelectedApproval(null)} width="max-w-xl">
          <ErrorBanner msg={modalError} />
          <div className="space-y-3 mb-5 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Full Name', selectedApproval.name],
                ['Age', selectedApproval.age],
                ['Father NIC', selectedApproval.fatherNic],
                ['Mother Name', selectedApproval.motherName],
                ['Birth Certificate', selectedApproval.birthCertificate],
                ['Resident Form', selectedApproval.residentForm],
                ['Marital Status', selectedApproval.maritalStatus],
                ['Submitted By', selectedApproval.user?.name ?? '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                  <p className="font-medium text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs text-cyan-500/70">Manager Verified By</p>
                <p className="font-semibold text-cyan-300">{selectedApproval.manager?.name ?? '—'}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button onClick={() => handleRejectApproval(selectedApproval.id)} disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-600/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-600/20 transition disabled:opacity-50">
              <XCircle className="h-4 w-4" /> Reject
            </button>
            <button onClick={() => { setModalError(null); setIsApproveConfirmOpen(true); }} disabled={actionLoading}
              id="approve-request-btn"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50">
              <Fingerprint className="h-4 w-4" /> Approve & Generate NIC
            </button>
          </div>
        </Modal>
      )}

      {/* Approve Confirm */}
      {selectedApproval && isApproveConfirmOpen && (
        <Modal title="Confirm NIC Auto-Generation" onClose={() => setIsApproveConfirmOpen(false)} width="max-w-md">
          <ErrorBanner msg={modalError} />
          <div className="mb-5 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Fingerprint className="h-8 w-8 text-emerald-400" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Generate Unique NIC?</h4>
            <p className="text-sm text-slate-400">
              The system will auto-generate a unique 13-digit NIC in the format <span className="font-mono text-white">XXXXX-XXXXXXX-X</span> and register{' '}
              <span className="font-semibold text-white">{selectedApproval.name}</span> in the Citizen Registry.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button onClick={() => setIsApproveConfirmOpen(false)} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition">
              Cancel
            </button>
            <button onClick={() => handleApprove(selectedApproval)} disabled={actionLoading}
              id="confirm-generate-nic-btn"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50">
              <BadgeCheck className="h-4 w-4" />
              {actionLoading ? 'Generating NIC...' : 'Confirm & Generate NIC'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
