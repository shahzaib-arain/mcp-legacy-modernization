import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Users, UserPlus, Trash2, Search, Edit2, LogOut, ShieldAlert,
  RefreshCw, X, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';

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
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Grid and Stats State
  const [records, setRecords] = useState<CitizenRecord[]>([]);
  const [stats, setStats] = useState<{ total: number; breakdown: Record<string, number> }>({ total: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    nic: '',
    fatherNic: '',
    motherName: '',
    birthCertificate: '',
    residentForm: '',
    maritalStatus: 'single',
    age: 18
  });
  
  const [editingNic, setEditingNic] = useState<string | null>(null);
  const [deletingNic, setDeletingNic] = useState<string | null>(null);
  const [bulkConfirmKeyword, setBulkConfirmKeyword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const recordsRes = await api.get(`/records?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      const statsRes = await api.get('/records/stats');
      
      if (recordsRes.status === 'success') {
        setRecords(recordsRes.data.records);
        setTotalPages(recordsRes.data.pagination.totalPages);
      }
      
      if (statsRes.status === 'success') {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search]);

  // Actions handlers
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      nic: '',
      fatherNic: '',
      motherName: '',
      birthCertificate: '',
      residentForm: '',
      maritalStatus: 'single',
      age: 18
    });
    setModalError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setActionLoading(true);

    if (formData.age < 18) {
      setModalError('Age must be 18 or older to apply for NIC Card.');
      setActionLoading(false);
      return;
    }

    try {
      const res = await api.post('/records', formData);
      if (res.status === 'success') {
        setIsCreateOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to create record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (record: CitizenRecord) => {
    setFormData({
      name: record.name,
      nic: record.nic,
      fatherNic: record.fatherNic,
      motherName: record.motherName,
      birthCertificate: record.birthCertificate,
      residentForm: record.residentForm,
      maritalStatus: record.maritalStatus,
      age: 18 // age not relevant for edit in schema
    });
    setEditingNic(record.nic);
    setModalError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setActionLoading(true);

    try {
      const res = await api.put(`/records/${editingNic}`, formData);
      if (res.status === 'success') {
        setIsEditOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to update record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDelete = (nic: string) => {
    setDeletingNic(nic);
    setModalError(null);
    setIsDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    setActionLoading(true);
    try {
      const res = await api.delete(`/records/${deletingNic}`);
      if (res.status === 'success') {
        setIsDeleteOpen(false);
        // If we deleted the last record on this page, go back a page
        if (records.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchData();
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to delete record.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenBulkDelete = () => {
    setBulkConfirmKeyword('');
    setModalError(null);
    setIsBulkDeleteOpen(true);
  };

  const handleBulkDeleteSubmit = async () => {
    setModalError(null);
    if (bulkConfirmKeyword !== 'DELETE ALL') {
      setModalError('Invalid confirm keyword. Type "DELETE ALL" to verify.');
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await api.delete('/records');
      if (res.status === 'success') {
        setIsBulkDeleteOpen(false);
        setPage(1);
        fetchData();
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to delete all records.');
    } finally {
      setActionLoading(false);
    }
  };

  // Get status bagdes styles
  const getStatusBadgeStyle = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    switch (lowercaseStatus) {
      case 'married':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'single':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'divorced':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'widowed':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'verified':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // Stats calculation
  const marriedCount = stats.breakdown?.married || 0;
  const singleCount = stats.breakdown?.single || 0;
  const divorcedCount = stats.breakdown?.divorced || 0;
  const widowedCount = stats.breakdown?.widowed || 0;
  const otherCount = stats.total - (marriedCount + singleCount + divorcedCount + widowedCount);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">NADRA Database Management</h1>
          <p className="mt-1 text-slate-400">Signed in as <span className="font-semibold text-emerald-400">{user?.name}</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg bg-red-600/10 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-600/20 transition"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Stats Cards Grid */}
      <section className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Total */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total Directory</span>
            <Users className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
          <div className="mt-2 text-xs text-slate-500">Active NIC cardholders</div>
        </div>

        {/* Card 2: Married */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Married</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{marriedCount}</p>
          <div className="mt-2 text-xs text-slate-500">
            {stats.total > 0 ? ((marriedCount / stats.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Card 3: Single */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Single</span>
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{singleCount}</p>
          <div className="mt-2 text-xs text-slate-500">
            {stats.total > 0 ? ((singleCount / stats.total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>

        {/* Card 4: Divorced / Widowed */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Divorced / Widowed</span>
            <span className="h-2 w-2 rounded-full bg-orange-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{divorcedCount + widowedCount}</p>
          <div className="mt-2 text-xs text-slate-500">{divorcedCount} Divorced | {widowedCount} Widowed</div>
        </div>

        {/* Card 5: Others */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Pending / Other Statuses</span>
            <span className="h-2 w-2 rounded-full bg-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{otherCount}</p>
          <div className="mt-2 text-xs text-slate-500">Legacy and testing tags</div>
        </div>
      </section>

      {/* Main Table Work Area */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm">
        {/* Controls header */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-6 sm:flex-row sm:items-center">
          <div className="relative max-w-md w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search by Name, NIC, Parents..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950/40 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition"
            >
              <UserPlus className="h-4 w-4" />
              Register Citizen
            </button>
            <button
              onClick={handleOpenBulkDelete}
              className="flex items-center gap-2 rounded-lg bg-red-950/20 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-900/30 transition"
            >
              <Trash2 className="h-4 w-4" />
              Purge Database
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-950/30 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800/50">
              <tr>
                <th className="px-6 py-4">Citizen Name</th>
                <th className="px-6 py-4">NIC Number</th>
                <th className="px-6 py-4">Father's NIC</th>
                <th className="px-6 py-4">Mother's Name</th>
                <th className="px-6 py-4">Birth Certificate</th>
                <th className="px-6 py-4">Resident Form</th>
                <th className="px-6 py-4">Marital Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span className="mt-2 block text-xs text-slate-500">Loading citizen directory...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-600" />
                    No records found matching search queries.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/10 transition">
                    <td className="px-6 py-4 font-medium text-white">{record.name}</td>
                    <td className="px-6 py-4 font-mono text-emerald-400">{record.nic}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{record.fatherNic}</td>
                    <td className="px-6 py-4 text-slate-400">{record.motherName}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{record.birthCertificate}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{record.residentForm}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeStyle(record.maritalStatus)}`}>
                        {record.maritalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(record)}
                          className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(record.nic)}
                          className="flex h-8 w-8 items-center justify-center rounded bg-red-950/20 text-red-400 hover:bg-red-900/20 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Register New citizen card</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {modalError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Citizen Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Assign NIC Number</label>
                  <input
                    type="text"
                    required
                    value={formData.nic}
                    onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Father or Relative NIC</label>
                  <input
                    type="text"
                    required
                    value={formData.fatherNic}
                    onChange={(e) => setFormData({ ...formData, fatherNic: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Mother Name</label>
                  <input
                    type="text"
                    required
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Birth Certificate ID</label>
                  <input
                    type="text"
                    required
                    value={formData.birthCertificate}
                    onChange={(e) => setFormData({ ...formData, birthCertificate: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Resident Form Number</label>
                  <input
                    type="text"
                    required
                    value={formData.residentForm}
                    onChange={(e) => setFormData({ ...formData, residentForm: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Marital Status</label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Age Gate Validation</label>
                  <input
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">System restriction: must be 18+ to register.</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Create NIC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Modify Citizen Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {modalError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Citizen Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">NIC Number</label>
                  <input
                    type="text"
                    required
                    value={formData.nic}
                    onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Father NIC</label>
                  <input
                    type="text"
                    required
                    value={formData.fatherNic}
                    onChange={(e) => setFormData({ ...formData, fatherNic: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Mother Name</label>
                  <input
                    type="text"
                    required
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Birth Certificate</label>
                  <input
                    type="text"
                    required
                    value={formData.birthCertificate}
                    onChange={(e) => setFormData({ ...formData, birthCertificate: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Resident Form Number</label>
                  <input
                    type="text"
                    required
                    value={formData.residentForm}
                    onChange={(e) => setFormData({ ...formData, residentForm: e.target.value })}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Marital Status</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                  <option value="pending">Pending</option>
                  <option value="testing">Testing</option>
                  <option value="verified">Verified</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert className="h-8 w-8" />
              <h3 className="text-lg font-bold text-white font-sans">Delete Citizen Record?</h3>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Are you sure you want to delete the record for NIC <span className="font-mono text-white font-semibold">{deletingNic}</span>? This action is permanent and cannot be undone.
            </p>
            {modalError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={actionLoading}
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert className="h-8 w-8" />
              <h3 className="text-lg font-bold text-white">Purge National Registry?</h3>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              WARNING: This will wipe out all citizen records from the database. To confirm, please type <span className="text-white font-bold font-mono">DELETE ALL</span> in the box below.
            </p>
            <input
              type="text"
              value={bulkConfirmKeyword}
              onChange={(e) => setBulkConfirmKeyword(e.target.value)}
              placeholder='Type "DELETE ALL" to confirm'
              className="mt-4 w-full rounded bg-slate-950 border border-slate-800 p-2.5 text-sm text-white focus:border-red-500 focus:outline-none placeholder-slate-600 font-mono"
            />
            {modalError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="rounded border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteSubmit}
                disabled={actionLoading || bulkConfirmKeyword !== 'DELETE ALL'}
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                {actionLoading ? 'Purging...' : 'Purge All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
