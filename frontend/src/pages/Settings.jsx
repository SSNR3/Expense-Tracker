import { useState } from 'react'
import { Save, Upload, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api.js'
import { CURRENCIES } from '../utils/constants.js'
import { sound } from '../components/Effects.jsx'

export default function Settings({ settings, setSettings }) {
  const [form, setForm] = useState({ ...settings })
  const [saving, setSaving] = useState(false)

  const handleThemeChange = (newTheme) => {
    setForm(prev => ({ ...prev, theme: newTheme }))
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', newTheme)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.settings.update(form)
      setSettings(form)
      handleThemeChange(form.theme || 'light')
      sound.coin()
      toast.success('Preferences saved')
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
      const res = await api.import.json(data)
      sound.party()
      toast.success(`Imported ${res.imported} records`)
    } catch (err) {
      toast.error('Import failed: ' + err.message)
    }
    e.target.value = ''
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in text-xs">
      <div>
        <h2 className="text-base font-bold text-stone-900 dark:text-white">Settings</h2>
        <p className="text-stone-500">System configuration and display settings</p>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[11px]">Interface & Currency</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Default Currency</label>
            <select
              className="input-field cursor-pointer"
              value={form.default_currency || 'INR'}
              onChange={e => setForm({ ...form, default_currency: e.target.value })}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Theme Mode</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex-1 py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  (form.theme || 'light') === 'light'
                    ? 'border-amber-500 bg-amber-500/10 font-bold text-stone-900 dark:text-white'
                    : 'border-stone-200 dark:border-stone-800 text-stone-400'
                }`}
              >
                <Sun size={13} /> Light
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                  form.theme === 'dark'
                    ? 'border-amber-500 bg-amber-500/10 font-bold text-stone-900 dark:text-white'
                    : 'border-stone-200 dark:border-stone-800 text-stone-400'
                }`}
              >
                <Moon size={13} /> Dark
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <div className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[11px]">Data Management</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-stone-600 dark:text-stone-400 font-semibold mb-1">Export Data</div>
            <div className="flex gap-2">
              <button onClick={() => api.export.csv()} className="btn-ghost">Export CSV</button>
              <button onClick={() => api.export.json()} className="btn-ghost">Export JSON</button>
            </div>
          </div>
          <div>
            <div className="text-stone-600 dark:text-stone-400 font-semibold mb-1">Import Data</div>
            <label className="btn-ghost cursor-pointer">
              <Upload size={12} /> Import JSON
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center py-2">
        <Save size={13} /> {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
