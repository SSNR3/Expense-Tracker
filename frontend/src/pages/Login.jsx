import { useState } from 'react'
import { Sparkles, Shield, User, Lock, ArrowRight, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api.js'

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password')
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        await api.auth.register({ username, password })
        toast.success('Account created! Logging in...')
      }
      const data = await api.auth.login(username, password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify({ username: data.username, role: data.role }))
      toast.success(`Welcome ${data.username}! (${data.role.toUpperCase()})`)
      onLoginSuccess(data)
    } catch (err) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen charcoal-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neonPink/20 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-electricSapphire/20 blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1.2s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-indigoBloom/20 blur-[100px] pointer-events-none animate-float-slow" />

      <div className="w-full max-w-md glass-card p-8 relative z-10 animate-fade-in border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-neonPink via-indigoBloom to-electricSapphire shadow-neon mb-4">
            <Sparkles size={32} className="text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight shimmer-text">
            FinFlow
          </h1>
          <p className="text-white/40 text-sm mt-1">Financial Intelligence & Expense Tracker</p>
        </div>

        <div className="flex bg-surface-700/60 p-1 rounded-xl mb-6 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isRegister ? 'bg-gradient-to-r from-neonPink to-indigoBloom text-white shadow-md' : 'text-white/50 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isRegister ? 'bg-gradient-to-r from-neonPink to-indigoBloom text-white shadow-md' : 'text-white/50 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <User size={13} className="text-neonPink" /> Username
            </label>
            <input
              type="text"
              required
              placeholder="e.g. admin or username"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Lock size={13} className="text-skyAqua" /> Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {isRegister ? <UserPlus size={16} /> : <ArrowRight size={16} />}
                {isRegister ? 'Create Account' : 'Sign In'}
              </span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/[0.08] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-700/60 border border-white/[0.06] text-xs text-white/50">
            <Shield size={13} className="text-skyAqua" />
            Default Super User: <span className="text-white font-mono font-medium">admin</span> / <span className="text-white font-mono font-medium">admin123</span>
          </div>
        </div>
      </div>
    </div>
  )
}
