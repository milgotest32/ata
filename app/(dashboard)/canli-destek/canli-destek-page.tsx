'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, Session } from '@/lib/supabase'
import { Headphones, Clock, X, Send, RefreshCw, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

type SlackMessage = {
  ts: string
  text: string
  user: string
  is_bot: boolean
}

export default function CanliDestekPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Session | null>(null)
  const [messages, setMessages] = useState<SlackMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (selected?.slack_thread_ts) {
      loadMessages(selected.slack_thread_ts)
      const t = setInterval(() => loadMessages(selected.slack_thread_ts!), 10000)
      return () => clearInterval(t)
    }
  }, [selected])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function load() {
    const { data } = await supabase
      .from('wa_sessions')
      .select('*')
      .not('slack_thread_ts', 'is', null)
      .neq('slack_thread_ts', '')
      .order('updated_at', { ascending: false })
    setSessions((data || []) as Session[])
    setLoading(false)
  }

  async function loadMessages(thread_ts: string) {
    setMsgLoading(true)
    const res = await fetch(`/api/slack/messages?thread_ts=${thread_ts}`)
    const data = await res.json()
    setMessages(data.messages || [])
    setMsgLoading(false)
  }

  async function sendMessage() {
    if (!reply.trim() || !selected?.slack_thread_ts) return
    setSending(true)
    const res = await fetch('/api/slack/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_ts: selected.slack_thread_ts, text: reply }),
    })
    const data = await res.json()
    if (data.ok) {
      setReply('')
      await loadMessages(selected.slack_thread_ts)
    } else {
      alert('Mesaj gönderilemedi: ' + data.error)
    }
    setSending(false)
  }

  async function endLiveSupport(phone: string) {
    if (!confirm(`${phone} numaralı müşteriyi bot moduna döndürmek istiyor musunuz?`)) return
    await supabase
      .from('wa_sessions')
      .update({ bulundugu_menu: 'gpt', updated_at: new Date().toISOString() })
      .eq('phone', phone)
    setSelected(null)
    load()
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sol panel — konuşma listesi */}
      <div className="w-80 border-r border-cream-200 flex flex-col bg-white shrink-0">
        <div className="p-6 border-b border-cream-100">
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-1">
            {sessions.length} aktif
          </p>
          <h1 className="font-display text-2xl text-ink-900">Canlı Destek</h1>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ember-500 animate-pulse" />
            <span className="text-[10px] font-mono text-ink-300">otomatik · 15s</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-ink-300 font-mono text-sm">yükleniyor...</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center">
              <Headphones className="w-8 h-8 mx-auto text-cream-300 mb-2" strokeWidth={1.5} />
              <p className="text-sm text-ink-400">Kuyruk boş</p>
            </div>
          ) : (
            sessions.map((s) => {
              const waitMinutes = Math.floor(
                (Date.now() - new Date(s.updated_at).getTime()) / 60000
              )
              const urgent = waitMinutes > 5
              const isSelected = selected?.phone === s.phone
              return (
                <button
                  key={s.phone}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left p-4 border-b border-cream-100 hover:bg-cream-50 transition-colors flex items-center gap-3 ${
                    isSelected ? 'bg-cream-100' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-ink-900 truncate">{s.phone}</div>
                    <div className="text-xs text-ink-400 truncate mt-0.5">
                      {s.musteri_yazdigi || '—'}
                    </div>
                    <div className={`text-[10px] font-mono mt-1 ${urgent ? 'text-ember-500' : 'text-ink-300'}`}>
                      <Clock className="w-2.5 h-2.5 inline mr-1" />
                      {waitMinutes}dk
                      {urgent && ' · acil'}
                    </div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-ink-300 shrink-0" />
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Sağ panel — mesajlaşma */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-6 py-4 border-b border-cream-200 bg-white flex items-center justify-between shrink-0">
            <div>
              <div className="font-mono text-ink-900">{selected.phone}</div>
              <div className="text-xs text-ink-400 mt-0.5">
                Slack thread · {selected.slack_thread_ts?.slice(0, 12)}...
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadMessages(selected.slack_thread_ts!)}
                className="w-8 h-8 rounded-lg hover:bg-cream-100 text-ink-300 hover:text-ink-700 transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => endLiveSupport(selected.phone)}
                className="px-3 py-1.5 text-xs bg-ember-50 text-ember-600 border border-ember-200 rounded-lg hover:bg-ember-100 transition-colors"
              >
                Bot'a devret
              </button>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg hover:bg-cream-100 text-ink-300 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mesajlar */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-cream-50">
            {msgLoading && messages.length === 0 ? (
              <div className="text-center text-ink-300 font-mono text-sm py-8">yükleniyor...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-ink-300 font-mono text-sm py-8">mesaj yok</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.ts}
                  className={`flex ${m.is_bot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      m.is_bot
                        ? 'bg-white border border-cream-200 text-ink-700 rounded-tl-sm'
                        : 'bg-ink-900 text-cream-50 rounded-tr-sm'
                    }`}
                  >
                    {m.text}
                    <div className={`text-[10px] mt-1 font-mono ${m.is_bot ? 'text-ink-300' : 'text-cream-400'}`}>
                      {new Date(parseFloat(m.ts) * 1000).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mesaj gönder */}
          <div className="p-4 border-t border-cream-200 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Müşteriye yanıt yaz... (Enter ile gönder)"
                className="flex-1 px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:border-moss-400 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !reply.trim()}
                className="w-11 h-11 rounded-xl bg-ink-900 text-cream-50 flex items-center justify-center hover:bg-ink-700 transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-ink-300 font-mono mt-2 ml-1">
              → Slack thread'ine gönderilir → n8n → WhatsApp'a iletilir
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-cream-50">
          <div className="text-center">
            <Headphones className="w-12 h-12 mx-auto text-cream-300 mb-3" strokeWidth={1.5} />
            <p className="text-ink-400 text-sm">Soldaki listeden bir konuşma seç</p>
          </div>
        </div>
      )}
    </div>
  )
}
