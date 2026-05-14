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
    <div className="flex h-screen overflow-hidden">
