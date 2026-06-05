'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Clock, CheckCircle2, AlertCircle, Loader2, Send, Sparkles, Calendar, ArrowUpRight, ImageIcon, Video, RefreshCw } from 'lucide-react'

type OmniPost = {
  id: number
  brand: string
  platform: string
  status: string
  media_url: string
  media_type: string
  post_type: string
  title: string | null
  caption: string | null
  hashtags: string | null
  scheduled_at: string | null
  created_at: string
}

const PLATFORMS = ['Instagram', 'Facebook', 'Twitter', 'YouTube', 'TikTok', 'LinkedIn']
const POST_TYPES = ['post', 'story', 'reel']
const BRANDS = ['Milgo', 'Donna']

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'from-pink-500 to-purple-600',
  Facebook: 'from-blue-500 to-blue-700',
  Twitter: 'from-sky-400 to-sky-600',
  YouTube: 'from-red-500 to-red-700',
  TikTok: 'from-zinc-800 to-zinc-950',
  LinkedIn: 'from-blue-600 to-blue-800',
}

const STATUS_META: Record<string, { label: string; dot: string; ring: string }> = {
  pending:   { label: 'Bekliyor',   dot: 'bg-amber-400',  ring: 'ring-amber-400/20' },
  scheduled: { label: 'Planlandı', dot: 'bg-blue-400',   ring: 'ring-blue-400/20' },
  published: { label: 'Yayında',   dot: 'bg-moss-400',   ring: 'ring-moss-400/20' },
  failed:    { label: 'Hatalı',    dot: 'bg-ember-400',  ring: 'ring-ember-400/20' },
}

const empty = {
  brand: 'Milgo',
  platform: 'Instagram',
  media_url: '',
  media_type: 'image' as 'image' | 'video',
  post_type: 'post',
  title: '',
  caption: '',
  hashtags: '',
  scheduled_at: '',
}

export default function PaylasimPage() {
  const [posts, setPosts] = useState<OmniPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [animateIn, setAnimateIn] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/omni')
    const d = await r.json()
    setPosts(d.posts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (showForm) setTimeout(() => setAnimateIn(true), 10) }, [showForm])

  function openForm() { setShowForm(true); setAnimateIn(false); setError('') }
  function closeForm() { setAnimateIn(false); setTimeout(() => { setShowForm(false); setForm(empty) }, 200) }

  async function handleSubmit() {
    if (!form.media_url) { setError('Medya URL zorunlu'); return }
    setSaving(true); setError('')
    const r = await fetch('/api/omni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, scheduled_at: form.scheduled_at || null }),
    })
    const d = await r.json()
    if (d.error) { setError(d.error); setSaving(false); return }
    closeForm(); load(); setSaving(false)
  }

  async function updateStatus(id: number, status: string) {
    await fetch('/api/omni', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const FILTERS = [
    { key: 'all', label: 'Tümü' },
    { key: 'pending', label: 'Bekliyor' },
    { key: 'scheduled', label: 'Planlandı' },
    { key: 'published', label: 'Yayında' },
  ]

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)
  const counts: Record<string, number> = {
    all: posts.length,
    pending: posts.filter(p => p.status === 'pending').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg, #0f0e0a)' }}>

      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-ink-300 mb-2 font-mono">OmniSocial</p>
          <h1 className="font-display text-4xl text-cream-50 leading-none tracking-tight">
            Paylaşım<br />
            <span className="text-moss-400">Planla</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="w-10 h-10 rounded-xl bg-ink-700 hover:bg-ink-500 transition-colors flex items-center justify-center text-ink-300 hover:text-cream-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openForm}
            className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-xl bg-moss-500 hover:bg-moss-400 text-ink-900 font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Yeni Paylaşım
          </button>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { key: 'all',       label: 'Toplam',    color: 'text-cream-100' },
          { key: 'pending',   label: 'Bekliyor',  color: 'text-amber-400' },
          { key: 'scheduled', label: 'Planlandı', color: 'text-blue-400'  },
          { key: 'published', label: 'Yayında',   color: 'text-moss-400'  },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`p-4 rounded-2xl border transition-all text-left ${
              filter === s.key
                ? 'bg-ink-700 border-ink-500'
                : 'bg-ink-900 border-ink-700 hover:border-ink-500'
            }`}
          >
            <div className={`text-3xl font-display font-semibold ${s.color}`}>{counts[s.key]}</div>
            <div className="text-xs text-ink-400 mt-1 font-mono tracking-wide">{s.label}</div>
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-ink-400 gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono">Yükleniyor</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-ink-700 rounded-3xl gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ink-800 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-ink-500" />
          </div>
          <div className="text-center">
            <p className="text-cream-50 font-medium text-sm">Henüz içerik yok</p>
            <p className="text-ink-500 text-xs mt-1">İlk paylaşımını ekle</p>
          </div>
          <button onClick={openForm} className="text-xs text-moss-400 hover:text-moss-300 underline underline-offset-4">
            Ekle →
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(post => {
            const meta = STATUS_META[post.status] || STATUS_META.pending
            return (
              <div
                key={post.id}
                className="group relative bg-ink-900 border border-ink-700 hover:border-ink-500 rounded-2xl p-5 flex items-center gap-5 transition-all"
              >
                {/* Medya thumb */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-ink-700 shrink-0">
                  {post.media_url && post.media_type === 'image' ? (
                    <img src={post.media_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {post.media_type === 'video'
                        ? <Video className="w-6 h-6 text-ink-500" />
                        : <ImageIcon className="w-6 h-6 text-ink-500" />}
                    </div>
                  )}
                  {/* Platform badge */}
                  <div className={`absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-r ${PLATFORM_COLORS[post.platform] || 'from-ink-600 to-ink-700'} flex items-center justify-center`}>
                    <span className="text-[9px] text-white font-bold tracking-wider uppercase">{post.platform}</span>
                  </div>
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Status */}
                    <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ring-1 ${meta.ring} bg-transparent`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse`} />
                      <span className="text-cream-200">{meta.label}</span>
                    </span>
                    <span className="text-[11px] text-ink-500 bg-ink-800 px-2 py-1 rounded-full font-mono">{post.post_type}</span>
                    <span className="text-[11px] text-ink-500 bg-ink-800 px-2 py-1 rounded-full font-mono">{post.brand}</span>
                  </div>

                  {post.title && (
                    <p className="text-sm font-semibold text-cream-100 truncate leading-snug">{post.title}</p>
                  )}
                  {post.caption && (
                    <p className="text-xs text-ink-300 truncate mt-0.5">{post.caption}</p>
                  )}
                  {post.hashtags && (
                    <p className="text-xs text-moss-500 truncate mt-0.5">{post.hashtags}</p>
                  )}

                  <div className="flex items-center gap-4 mt-2.5">
                    {post.scheduled_at && (
                      <span className="flex items-center gap-1.5 text-[11px] text-blue-400 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.scheduled_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="text-[11px] text-ink-600 font-mono">
                      {new Date(post.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                {/* Aksiyonlar — sadece hover'da görünür */}
                {post.status === 'pending' && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => updateStatus(post.id, 'scheduled')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" /> Planla
                    </button>
                    <button
                      onClick={() => updateStatus(post.id, 'published')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-moss-500/10 hover:bg-moss-500/20 text-moss-400 text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Yayınla
                    </button>
                  </div>
                )}
                {post.media_url && (
                  <a
                    href={post.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-lg bg-ink-700 hover:bg-ink-600 flex items-center justify-center text-ink-400 hover:text-cream-50 shrink-0"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {showForm && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 transition-all duration-200 ${animateIn ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'}`}
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}
        >
          <div className={`w-full max-w-md bg-ink-900 border border-ink-700 rounded-3xl overflow-hidden transition-all duration-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-ink-800">
              <div>
                <p className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mb-0.5">OmniSocial</p>
                <h2 className="text-lg font-display font-semibold text-cream-50 leading-tight">Yeni Paylaşım</h2>
              </div>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-xl bg-ink-800 hover:bg-ink-700 flex items-center justify-center text-ink-400 hover:text-cream-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* Marka + Platform */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Marka</span>
                  <div className="flex gap-1.5">
                    {BRANDS.map(b => (
                      <button
                        key={b}
                        onClick={() => setForm(f => ({ ...f, brand: b }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          form.brand === b
                            ? 'bg-moss-700 border-moss-500 text-moss-200'
                            : 'bg-ink-800 border-ink-700 text-ink-400 hover:text-cream-50 hover:border-ink-500'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </label>

                <label className="block">
                  <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">İçerik türü</span>
                  <div className="flex gap-1.5">
                    {POST_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, post_type: t }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border capitalize ${
                          form.post_type === t
                            ? 'bg-ink-600 border-ink-400 text-cream-100'
                            : 'bg-ink-800 border-ink-700 text-ink-400 hover:text-cream-50 hover:border-ink-500'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </label>
              </div>

              {/* Platform seçici */}
              <label className="block">
                <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Platform</span>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className={`py-2 rounded-xl text-xs font-medium transition-all border ${
                        form.platform === p
                          ? 'border-transparent text-white bg-gradient-to-r ' + PLATFORM_COLORS[p]
                          : 'bg-ink-800 border-ink-700 text-ink-400 hover:text-cream-50 hover:border-ink-500'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </label>

              {/* Medya tipi */}
              <label className="block">
                <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Medya türü</span>
                <div className="flex gap-2">
                  {(['image', 'video'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, media_type: t }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border transition-all ${
                        form.media_type === t
                          ? 'bg-ink-600 border-ink-400 text-cream-100'
                          : 'bg-ink-800 border-ink-700 text-ink-400 hover:text-cream-50 hover:border-ink-500'
                      }`}
                    >
                      {t === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                      {t === 'image' ? 'Resim' : 'Video'}
                    </button>
                  ))}
                </div>
              </label>

              {/* Media URL */}
              <label className="block">
                <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Medya URL *</span>
                <input
                  type="url"
                  placeholder="https://cdn.example.com/photo.jpg"
                  value={form.media_url}
                  onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 focus:border-moss-500 rounded-xl px-4 py-3 text-sm text-cream-100 placeholder-ink-600 outline-none transition-colors font-mono"
                />
              </label>

              {/* Başlık */}
              <label className="block">
                <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Başlık</span>
                <input
                  type="text"
                  placeholder="Başlık..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 focus:border-moss-500 rounded-xl px-4 py-3 text-sm text-cream-100 placeholder-ink-600 outline-none transition-colors"
                />
              </label>

              {/* Caption */}
              <label className="block">
                <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Açıklama</span>
                <textarea
                  rows={3}
                  placeholder="Post açıklaması..."
                  value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 focus:border-moss-500 rounded-xl px-4 py-3 text-sm text-cream-100 placeholder-ink-600 outline-none transition-colors resize-none"
                />
              </label>

              {/* Hashtags */}
              <label className="block">
                <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Hashtag'ler</span>
                <input
                  type="text"
                  placeholder="#milgo #çiğsüt #istanbul"
                  value={form.hashtags}
                  onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 focus:border-moss-500 rounded-xl px-4 py-3 text-sm text-moss-400 placeholder-ink-600 outline-none transition-colors font-mono"
                />
              </label>

              {/* Tarih */}
              <label className="block">
                <span className="text-[11px] font-mono text-ink-400 uppercase tracking-widest mb-2 block">Planlanan Tarih</span>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 focus:border-moss-500 rounded-xl px-4 py-3 text-sm text-cream-100 outline-none transition-colors [color-scheme:dark]"
                />
              </label>

              {/* Hata */}
              {error && (
                <div className="flex items-center gap-2.5 text-sm text-ember-400 bg-ember-400/10 border border-ember-400/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 py-3 rounded-xl border border-ink-700 text-ink-300 hover:text-cream-50 hover:border-ink-500 text-sm font-medium transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-moss-500 hover:bg-moss-400 text-ink-900 text-sm font-semibold transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
