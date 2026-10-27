import { useState, useEffect } from 'react'
import { Users, Shield, KeyRound, Trash2, Calendar, Activity, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api.js'
import { formatAmount } from '../utils/constants.js'

export default function UsersManagement({ settings, currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [resetModal, setResetModal] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const currency = settings?.default_currency || 'INR'

  const loadUsers = () => {
    setLoading(true)
    api.admin.listUsers()
      .then(res => setUsers(Array.isArray(res) ? res : []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadUsers() }, [])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match')
    }
    setSaving(true)
    try {
      await api.admin.resetPassword(resetModal.id, newPassword)
      toast.success(`Password updated for ${resetModal.username}`)
      setResetModal(null)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, username) => {
    if (!window.confirm(`Are you sure you want to delete ${username} and all their records?`)) return
    try {
      await api.admin.deleteUser(id)
      toast.success(`User ${username} deleted`)
      loadUsers()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">User Management & Tracking</h2>
          <p className="text-stone-500 text-sm mt-0.5">Audit user activities, monitor transactions, and manage passwords</p>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
          <Shield className="text-amber-600" size="{13}"/> Administrative Access
        </div>
      </div>

      {/* Users table */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200/80 bg-stone-50/50 flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider">
          <div className="w-12">ID</div>
          <div className="flex-1">User Account</div>
          <div className="w-28">Role</div>
          <div className="w-32">Activity / Logs</div>
          <div className="w-36 text-right">Total Spent</div>
          <div className="w-32 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-stone-400 text-sm">Loading user accounts...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">No accounts found</div>
        ) : (
          users.map(u => (
            <div key={u.id} className="table-row group border-b border-stone-200/60 last:border-0 hover:bg-amber-50/40">
              <div className="w-12 font-mono text-stone-400 text-xs">#{u.id}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-stone-900 text-sm flex items-center gap-2">
                  {u.username}
                  {u.id === currentUser?.id && (
                    <span className="text-[10px] bg-stone-900 text-white px-2 py-0.5 rounded-full font-bold">You</span>
                  )}
                </div>
                <div className="text-stone-400 text-xs flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar size="{11}"/> Created {u.created_at ? u.created_at.split(' ')[0] : 'N/A'}</span>
                  <span>·</span>
                  <span>Last seen: {u.last_login ? u.last_login.split(' ')[0] : 'Never'}</span>
                </div>
              </div>

              <div className="w-28">
                <span className={`chip text-xs ${u.role === 'admin' ? 'bg-amber-500/15 text-amber-800 border-amber-500/30 font-bold' : 'bg-stone-100 text-stone-700 border-stone-300'}`}>
                  {u.role === 'admin' ? 'Superuser' : 'Standard'}
                </span>
              </div>

              <div className="w-32 text-xs text-stone-600 flex items-center gap-1.5">
                <Activity className="text-amber-600" size="{12}"/>
                <span className="font-mono font-semibold">{u.total_expenses}</span> expenses logged
              </div>

              <div className="w-36 text-right font-mono font-bold text-stone-900 text-sm">
                {formatAmount(u.total_spent, currency)}
              </div>

              <div className="w-32 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => setResetModal(u)}
                  className="btn-ghost p-1.5 text-xs text-stone-600 hover:text-amber-800"
                  title="Change Password"
                >
                  <KeyRound size="{14}"/>
                </button>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDelete(u.id, u.username)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    title="Delete User"
                  >
                    <Trash2 size="{14}"/>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 animate-slide-up shadow-2xl bg-white border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <KeyRound size="{16}"/>
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Reset Password</h3>
                  <p className="text-stone-400 text-xs">Target: {resetModal.username}</p>
                </div>
              </div>
              <button onClick={() => setResetModal(null)} className="btn-ghost p-1.5"><X size="{15}"/></button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="label">New Secure Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 uppercase, 1 digit"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setResetModal(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
