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
        const res = await api.auth.register({ username, password })
        toast.success(res.message || 'Account created!')
      }
      const data = await api.auth.login(username, password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify({ username: data.username, role: data.role }))
      toast.success(`Welcome back, ${data.username}! (${data.role.toUpperCase()})`)
      onLoginSuccess(data)
    } catch (err) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen applied-canvas flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-amber-400/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-600/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-card p-8 relative z-10 animate-fade-in shadow-xl bg-white/95 border border-stone-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400 border border-amber-300 text-stone-950 shadow-md mb-3">
            <Sparkles size="{28}"/>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">FinFlow</h1>
          <p className="text-stone-500 text-xs mt-1">Financial Intelligence & Multi-Tenant Engine</p>
        </div>

        <div className="flex bg-stone-100 p-1 rounded-xl mb-6 border border-stone-200">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isRegister ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isRegister ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <User className="text-amber-600" size="{13}"/> Username
            </label>
            <input
              type="text"
              required
              placeholder="Enter your username"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Lock className="text-amber-600" size="{13}"/> Password
            </label>
            <input
              type="password"
              required
              placeholder={isRegister ? "Min 8 chars, 1 uppercase, 1 digit" : "••••••••"}
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
            {loading ? 'Authenticating...' : (
              <span className="flex items-center gap-2 font-bold">
                {isRegister ? <UserPlus size="{16}"/> : <ArrowRight size="{16}"/>}
                {isRegister ? 'Register Account' : 'Access Portal'}
              </span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 text-center">
          <p className="text-stone-400 text-[11px]">
            {isRegister ? "The first registered user is automatically promoted to Superuser." : "Protected by timing-safe encryption & rate limiting."}
          </p>
        </div>
      </div>
    </div>
  )
}
