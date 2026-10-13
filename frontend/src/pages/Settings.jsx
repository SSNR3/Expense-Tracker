import { useState } from 'react'
import { Save, Upload, CheckCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api.js'
import { CURRENCIES } from '../utils/constants.js'
import { sound } from '../components/Effects.jsx'

export default function Settings({ settings, setSettings }) {
  const [form, setForm] = useState({ ...settings })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.settings.update(form)
      setSettings(form)
      sound.coin()
      toast.success('Settings saved ✅')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch('/api/import/json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await res.json()
      sound.party()
      toast.success(`Imported ${result.imported} transactions 🎉`)
    } catch (err) {
      toast.error('Import failed: ' + err.message)
    }
    e.target.value = ''
  }

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-white/40 text-sm mt-0.5">Configure your financial tracker preferences</p>
      </div>

      {/* General */}
      <div className="glass-card p-5 space-y-4 float-card">
        <div className="section-title">General</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Default Currency</label>
            <select className="input-field text-sm" value={form.default_currency || 'INR'} onChange={e => setForm({...form, default_currency: e.target.value})}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Theme</label>
            <select className="input-field text-sm" value={form.theme || 'dark'} onChange={e => setForm({...form, theme: e.target.value})}>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Status */}
      <div className="glass-card p-5 space-y-4 float-card border border-emerald/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald/15 border border-emerald/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-emerald" />
          </div>
          <div>
            <div className="section-title text-emerald">AI Advisor — Active</div>
            <p className="text-white/40 text-sm mt-0.5">Your AI financial advisor is pre-configured and ready to use.</p>
          </div>
        </div>
        <div className="bg-surface-600 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Provider</span>
            <span className="text-white font-medium flex items-center gap-1.5">
              <Zap size={13} className="text-emerald" /> SambaNova Cloud
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Model</span>
            <span className="text-white/80 font-mono text-xs">Meta-Llama-3.1-8B-Instruct</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">Status</span>
            <span className="flex items-center gap-1.5 text-emerald text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              Online
            </span>
          </div>
        </div>
        <p className="text-white/25 text-xs">
          Your spending data is sent to the AI only when you actively use the chat. No data is stored by the AI provider.
        </p>
      </div>

      {/* Data Management */}
      <div className="glass-card p-5 space-y-4 float-card">
        <div className="section-title">Data Management</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-white/60 text-sm font-medium mb-1">Export Data</div>
            <div className="text-white/30 text-xs mb-3">Download all expenses as CSV or JSON.</div>
            <div className="flex gap-2">
              <button onClick={() => api.export.csv()} className="btn-ghost text-xs border border-white/10">Export CSV</button>
              <button onClick={() => api.export.json()} className="btn-ghost text-xs border border-white/10">Export JSON</button>
            </div>
          </div>
          <div>
            <div className="text-white/60 text-sm font-medium mb-1">Import Data</div>
            <div className="text-white/30 text-xs mb-3">Restore from a JSON backup file.</div>
            <label className="btn-ghost text-xs border border-white/10 cursor-pointer">
              <Upload size={13} /> Import JSON
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-3 text-sm">
        <Save size={15} />
        {saving ? 'Saving…' : 'Save Settings'}
      </button>

      <div className="glass-card p-4 text-white/25 text-xs space-y-1">
        <div className="font-semibold text-white/40">FinFlow — Personal Finance Intelligence</div>
        <div>Running entirely on your local machine. SQLite at <code className="text-white/40">data/expenses.db</code></div>
        <div>Backend: FastAPI · Frontend: React + Vite · AI: Llama 3.1 via SambaNova</div>
      </div>
    </div>
  )
}
