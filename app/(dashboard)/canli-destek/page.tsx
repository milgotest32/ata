'use client'

import { useEffect, useState } from 'react'
import { supabase, Session } from '@/lib/supabase'
import { Headphones, Clock, MessageCircle, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function CanliDestekPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  async function load() {
    const { data } = await supabase
      .from('wa_sessions')
      .select('*')
      .eq('bulundugu_menu', 'canli')
      .order('updated_at', { ascending: false })
    setSessions((data || []) as Session[])
    setLoading(false)
  }

  async function endLiveSupport(phone: string) {
    if (!confirm(`${phone} numaralı müşteriyi canlı destekten çıkarmak istediğinize emin misiniz?`)) return
    await supabase
      .from('wa_sessions')
      .update({
        bulundugu_menu: 'gpt',
        slack_thread_ts: null,
        updated_at: new Date().toISOString(),
      })
      .eq('phone', phone)
    load()
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">
            {sessions.length} aktif talep
          </p>
          <h1 className="font-display text-5xl text-ink-900 tracking-tight">
            Canlı Destek
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-ember-500">
          <span className="w-2 h-2 rounded-full bg-ember-500 animate-pulse" />
          <span className="font-mono">otomatik yenileme · 15s</span>
        </div>
      </header>

      {loading ? (
        <div className="text-ink-300 font-mono text-sm">yükleniyor...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-cream-200 rounded-2xl p-16 text-center">
          <Headphones
            className="w-12 h-12 mx-auto text-moss-300 mb-4"
            strokeWidth={1.5}
          />
          <h3 className="font-display text-2xl text-ink-900 mb-2">
            Kuyruk Boş
          </h3>
          <p className="text-sm text-ink-500">
            Şu an canlı destek bekleyen müşteri bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {sessions.map((s) => {
            const waitMinutes = Math.floor(
              (Date.now() - new Date(s.updated_at).getTime()) / 60000
            )
            const urgent = waitMinutes > 5
            return (
              <div
                key={s.phone}
                className={`bg-white border rounded-2xl p-6 transition-all hover:shadow-[0_8px_24px_-12px_rgba(34,32,26,0.15)] ${
                  urgent ? 'border-ember-400/50' : 'border-cream-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-mono text-lg text-ink-900 mb-1">
                      {s.phone}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3 text-ink-300" />
                      <span
                        className={`font-mono ${
                          urgent ? 'text-ember-600' : 'text-ink-500'
                        }`}
                      >
                        {waitMinutes}dk bekliyor
                      </span>
                      {urgent && (
                        <span className="px-2 py-0.5 bg-ember-500/10 text-ember-600 text-[10px] uppercase tracking-wide rounded-full font-medium">
                          Acil
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => endLiveSupport(s.phone)}
                    className="w-8 h-8 rounded-lg hover:bg-cream-100 text-ink-300 hover:text-ember-500 transition-colors flex items-center justify-center"
                    title="Bot moduna döndür"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-cream-50 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-ink-300 mt-0.5 shrink-0" />
                    <p className="text-sm text-ink-700 leading-relaxed">
                      {s.musteri_yazdigi || 'Mesaj yok'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-300">
                    {formatDistanceToNow(new Date(s.updated_at), {
                      addSuffix: true,
                      locale: tr,
                    })}
                  </span>
                  {s.slack_thread_ts && (
                    <span className="text-moss-500 font-mono">
                      Slack: {s.slack_thread_ts.slice(0, 12)}...
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
