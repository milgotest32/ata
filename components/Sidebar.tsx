'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  MessagesSquare,
  Headphones,
  ShoppingBag,
  Repeat,
  BarChart3,
  LogOut,
} from 'lucide-react'

const items = [
  { href: '/', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/konusmalar', label: 'Konuşmalar', icon: MessagesSquare },
  { href: '/canli-destek', label: 'Canlı Destek', icon: Headphones },
  { href: '/siparisler', label: 'Siparişler', icon: ShoppingBag },
  { href: '/abonelikler', label: 'Abonelikler', icon: Repeat },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 shrink-0 bg-ink-900 text-cream-100 min-h-screen sticky top-0 flex flex-col">
      <div className="px-6 py-8 border-b border-ink-700">
        <div className="font-display text-2xl tracking-tight text-cream-50">
          milgo<span className="text-moss-300">.</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-ink-300 mt-0.5">
          admin
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? 'bg-moss-700 text-cream-50'
                      : 'text-ink-200 hover:bg-ink-700 hover:text-cream-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-moss-300" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-ink-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ink-300 hover:text-cream-50 hover:bg-ink-700 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
