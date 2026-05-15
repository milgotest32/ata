'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { Menu, Moon, Sun, Tv } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const [tv, setTv] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem('milgo-dark')
    if (saved === 'true') { setDark(true); document.documentElement.classList.add('dark') }
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    localStorage.setItem('milgo-dark', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  function toggleTv() {
    setTv(v => !v)
    if (!tv) router.push('/tv')
  }

  return (
    <div className={`min-h-screen flex ${dark ? 'dark bg-gray-950' : 'bg-cream-50'}`}>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className={`fixed lg:sticky top-0 z-50 h-screen transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onClose={() => setOpen(false)} dark={dark} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobil + dark mode header */}
        <div className={`flex items-center justify-between px-4 py-3 sticky top-0 z-30 ${dark ? 'bg-gray-900 border-b border-gray-800' : 'bg-ink-900 lg:bg-white lg:border-b lg:border-cream-200'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden w-9 h-9 flex items-center justify-center text-ink-300 hover:text-cream-50">
              <Menu className="w-5 h-5" />
            </button>
            <div className={`font-display text-xl lg:hidden ${dark ? 'text-white' : 'text-cream-50'}`}>milgo<span className="text-moss-300">.</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${dark ? 'text-yellow-400 hover:bg-gray-800' : 'text-ink-300 lg:text-ink-400 hover:bg-cream-100 lg:hover:bg-cream-100'}`}
              title={dark ? 'Açık mod' : 'Koyu mod'}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a
              href="/tv"
              target="_blank"
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${dark ? 'text-gray-400 hover:bg-gray-800' : 'text-ink-300 lg:text-ink-400 hover:bg-cream-100'}`}
              title="TV Modu"
            >
              <Tv className="w-4 h-4" />
            </a>
          </div>
        </div>

        <main className={`flex-1 overflow-x-hidden ${dark ? 'bg-gray-950 text-gray-100' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
