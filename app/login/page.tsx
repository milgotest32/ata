'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    if (data.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(data.error || 'Hata')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 grain px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-32 w-96 h-96 rounded-full bg-moss-200 opacity-30 blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full bg-cream-300 opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-block mb-6">
            <div className="font-display text-5xl tracking-tight text-ink-900">
              milgo<span className="text-moss-500">.</span>
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-ink-300 mt-1">
              admin panel
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-xl border border-cream-200 rounded-3xl p-10 shadow-[0_8px_40px_-12px_rgba(34,32,26,0.15)] animate-fade-in"
        >
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-ink-300 font-medium">
              Yönetici Şifresi
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="mt-3 w-full px-5 py-4 bg-cream-50 border border-cream-200 rounded-xl text-ink-700 font-mono text-lg focus:outline-none focus:border-moss-400 focus:bg-white transition-all"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="mt-4 text-sm text-ember-600 font-medium">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-4 bg-ink-900 text-cream-50 rounded-xl font-medium tracking-wide hover:bg-moss-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
          </button>
        </form>

        <p className="text-center text-xs text-ink-300 mt-8 tracking-wide">
          Milgo WhatsApp Bot · Yönetim Konsolu
        </p>
      </div>
    </div>
  )
}
