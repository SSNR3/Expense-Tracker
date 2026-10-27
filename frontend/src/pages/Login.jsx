import { useState } from 'react'
import { Sparkles, User, Lock, ArrowRight, UserPlus } from 'lucide-react'
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
      toast.success(`Welcome, ${data.username}!`)
      onLoginSuccess(data)
    } catch (err) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen applied-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-xs glass-card p-6 shadow-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400 text-stone-950 shadow-sm mb-2">
            <Sparkles size={20} />
          </div>
          <h1 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">FinFlow</h1>
          <p className="text-stone-500 text-[11px]">Financial Operations Engine</p>
        </div>

        <div className="flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg mb-4 text-xs">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
              !isRegister ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-1.5 font-semibold rounded-md transition-all ${
              isRegister ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label flex items-center gap-1">
              <User size={11} className="text-amber-500" /> Username
            </label>
            <input
              type="text"
              required
              placeholder="Username"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-1">
              <Lock size={11} className="text-amber-500" /> Password
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
            className="btn-primary w-full justify-center py-2 text-xs mt-2"
          >
            {loading ? 'Processing...' : (
              <span className="flex items-center gap-1.5">
                {isRegister ? <UserPlus size={14} /> : <ArrowRight size={14} />}
                {isRegister ? 'Create Account' : 'Authenticate'}
              </span>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 text-center">
          <p className="text-stone-400 text-[10px]">
            {isRegister ? "First user registered becomes Superuser." : "Protected by rate-limiting & HMAC authentication."}
          </p>
        </div>
      </div>
    </div>
  )
}
