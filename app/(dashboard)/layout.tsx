'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-cream-50">
      {/* Mobil overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar — masaüstü sabit, mobil drawer */}
      <div className={`fixed lg:sticky top-0 z-50 h-screen transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* İçerik */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Mobil header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-ink-900 sticky top-0 z-30">
          <div className="font-display text-xl text-cream-50">milgo<span className="text-moss-300">.</span></div>
          <button onClick={() => setOpen(true)} className="w-9 h-9 flex items-center justify-center text-ink-300 hover:text-cream-50">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
