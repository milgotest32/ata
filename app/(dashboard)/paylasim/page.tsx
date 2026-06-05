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

const PLATFORMS = ['Instagram', 'YouTube', 'Pinterest', 'TikTok']
const POST_TYPES = ['post', 'story', 'reel']
const BRANDS = ['Milgo']

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: 'from-pink-500 to-purple-600',
  YouTube:   'from-red-500 to-red-700',
  Pinterest: 'from-red-400 to-rose-700',
  TikTok:    'from-zinc-600 to-zinc-900',
}

const STATUS_META: Record<string, { label: string; dot: string }> = {
  pending:   { label: 'Bekliyor',  dot: 'bg-amber-400'  },
  scheduled: { label: 'Planlandı', dot: 'bg-blue-400'   },
  published: { label: 'Yayında',   dot: 'bg-moss-400'   },
  failed:    { label: 'Hatalı',    dot: 'bg-ember-400'  },
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-mono text-ink-300 tracking-widest uppercase mb-2">{label}</p>
      {children}
    </div>
  )
}

// Her yerde kullanılan input stili — inline bg garantili
const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-cream-100 placeholder-ink-300 outline-none transition-colors border border-ink-700 focus:border-moss-500"
const inputStyle = { background: '#1a2415' } // moss-800'e yakın koyu

export default function PaylasimPage() {
  const [posts, setPosts] = useState<OmniPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    const r = await fetch('/api/omni')
    const d = await r.json()
    setPosts(d.posts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function closeForm() { setShowForm(false); setForm(empty); setError('') }

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

  const counts: Record<string, number> = {
    all:       posts.length,
    pending:   posts.filter(p => p.status === 'pending').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
  }
  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-ink-300 mb-1.5 font-mono">OmniSocial</p>
          <h1 className="font-display text-4xl text-cream-50 leading-none tracking-tight">
            Paylaşım <span className="text-moss-400">Planla</span>
          </h1>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="w-10 h-10 rounded-xl border border-ink-700 flex items-center justify-center text-ink-300 hover:text-cream-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-moss-500 hover:bg-moss-400 text-ink-900 font-semibold text-sm transition-all"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Yeni Paylaşım
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { key: 'all',       label: 'Toplam',    cls: 'text-cream-100' },
          { key: 'pending',   label: 'Bekliyor',  cls: 'text-amber-400' },
          { key: 'scheduled', label: 'Planlandı', cls: 'text-blue-400'  },
          { key: 'published', label: 'Yayında',   cls: 'text-moss-400'  },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`p-4 rounded-2xl border text-left transition-all ${filter === s.key ? 'border-moss-700 bg-moss-700' : 'border-ink-700 hover:border-ink-500'}`}
            style={{ background: filter === s.key ? undefined : '#0f0e0a' }}
          >
            <div className={`text-3xl font-display font-semibold ${s.cls}`}>{counts[s.key]}</div>
            <div className="text-xs text-ink-300 mt-1 font-mono">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-ink-300 gap-3">
          <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm font-mono">Yükleniyor</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 border border-dashed border-ink-700 rounded-3xl gap-3">
          <Sparkles className="w-7 h-7 text-ink-500" />
          <p className="text-sm text-ink-300">Henüz paylaşım yok</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-moss-400 hover:text-moss-300 underline underline-offset-4">Ekle →</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(post => {
            const meta = STATUS_META[post.status] || STATUS_META.pending
            return (
              <div key={post.id} className="group relative border border-ink-700 hover:border-ink-500 rounded-2xl p-5 flex items-center gap-5 transition-all" style={{ background: '#0f0e0a' }}>
                {/* Thumb */}
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0" style={{ background: '#22201a' }}>
                  {post.media_url && post.media_type === 'image' ? (
                    <img src={post.media_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {post.media_type === 'video' ? <Video className="w-5 h-5 text-ink-500" /> : <ImageIcon className="w-5 h-5 text-ink-500" />}
                    </div>
                  )}
                  <div className={`absolute bottom-0 inset-x-0 h-5 bg-gradient-to-r ${PLATFORM_COLORS[post.platform] || 'from-ink-700 to-ink-900'} flex items-center justify-center`}>
                    <span className="text-[9px] text-white font-bold tracking-wider uppercase">{post.platform}</span>
                  </div>
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-ink-700" style={{ background: '#22201a' }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      <span className="text-cream-200">{meta.label}</span>
                    </span>
                    <span className="text-xs text-ink-300 px-2 py-1 rounded-full border border-ink-700 font-mono" style={{ background: '#22201a' }}>{post.post_type}</span>
                    <span className="text-xs text-ink-300 px-2 py-1 rounded-full border border-ink-700 font-mono" style={{ background: '#22201a' }}>{post.brand}</span>
                  </div>
                  {post.title    && <p className="text-sm font-semibold text-cream-100 truncate">{post.title}</p>}
                  {post.caption  && <p className="text-xs text-ink-300 truncate mt-0.5">{post.caption}</p>}
                  {post.hashtags && <p className="text-xs text-moss-500 truncate mt-0.5">{post.hashtags}</p>}
                  <div className="flex items-center gap-4 mt-2">
                    {post.scheduled_at && (
                      <span className="flex items-center gap-1 text-xs text-blue-400 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.scheduled_at).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    )}
                    <span className="text-xs text-ink-500 font-mono">{new Date(post.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>

                {/* Aksiyonlar */}
                {post.status === 'pending' && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => updateStatus(post.id, 'scheduled')} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-blue-400 border border-blue-400/20 hover:border-blue-400/50 transition-colors" style={{ background: 'rgba(96,165,250,0.08)' }}>
                      <Clock className="w-3.5 h-3.5" /> Planla
                    </button>
                    <button onClick={() => updateStatus(post.id, 'published')} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-moss-400 border border-moss-400/20 hover:border-moss-400/50 transition-colors" style={{ background: 'rgba(122,160,92,0.08)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Yayınla
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) closeForm() }}>
          <div className="w-full max-w-md rounded-3xl border border-ink-700 overflow-hidden flex flex-col" style={{ background: '#0f0e0a', maxHeight: '90vh' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-ink-700">
              <div>
                <p className="text-[10px] font-mono text-ink-300 uppercase tracking-widest mb-0.5">OmniSocial</p>
                <h2 className="text-lg font-display font-semibold text-cream-50">Yeni Paylaşım</h2>
              </div>
              <button onClick={closeForm} className="w-8 h-8 rounded-xl border border-ink-700 flex items-center justify-center text-ink-300 hover:text-cream-100 transition-colors" style={{ background: '#22201a' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* Marka */}
              <Field label="Marka">
                <div className="flex gap-2">
                  {BRANDS.map(b => (
                    <button key={b} onClick={() => setForm(f => ({ ...f, brand: b }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.brand === b ? 'border-moss-500 text-moss-200' : 'border-ink-700 text-ink-300 hover:text-cream-100 hover:border-ink-500'}`}
                      style={{ background: form.brand === b ? '#293821' : '#22201a' }}
                    >{b}</button>
                  ))}
                </div>
              </Field>

              {/* Platform */}
              <Field label="Platform">
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${form.platform === p ? 'border-transparent text-white bg-gradient-to-r ' + PLATFORM_COLORS[p] : 'border-ink-700 text-ink-300 hover:text-cream-100 hover:border-ink-500'}`}
                      style={form.platform === p ? {} : { background: '#22201a' }}
                    >{p}</button>
                  ))}
                </div>
              </Field>

              {/* İçerik türü + Medya türü */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="İçerik türü">
                  <div className="flex gap-1.5">
                    {POST_TYPES.map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, post_type: t }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${form.post_type === t ? 'border-ink-500 text-cream-100' : 'border-ink-700 text-ink-300 hover:text-cream-100'}`}
                        style={{ background: form.post_type === t ? '#3d3a30' : '#22201a' }}
                      >{t}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Medya türü">
                  <div className="flex gap-1.5">
                    {(['image','video'] as const).map(t => (
                      <button key={t} onClick={() => setForm(f => ({ ...f, media_type: t }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all ${form.media_type === t ? 'border-ink-500 text-cream-100' : 'border-ink-700 text-ink-300 hover:text-cream-100'}`}
                        style={{ background: form.media_type === t ? '#3d3a30' : '#22201a' }}
                      >
                        {t === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                        {t === 'image' ? 'Resim' : 'Video'}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              {/* Medya URL */}
              <Field label="Medya URL *">
                <input type="url" placeholder="https://cdn.example.com/photo.jpg"
                  value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                  className={inputCls} style={inputStyle}
                />
              </Field>

              {/* Başlık */}
              <Field label="Başlık">
                <input type="text" placeholder="Paylaşım başlığı..."
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls} style={inputStyle}
                />
              </Field>

              {/* Caption */}
              <Field label="Açıklama">
                <textarea rows={3} placeholder="Post açıklaması..."
                  value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  className={`${inputCls} resize-none`} style={inputStyle}
                />
              </Field>

              {/* Hashtags */}
              <Field label="Hashtag'ler">
                <input type="text" placeholder="#milgo #çiğsüt #istanbul"
                  value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                  className={`${inputCls} text-moss-400 font-mono`} style={inputStyle}
                />
              </Field>

              {/* Tarih */}
              <Field label="Planlanan Tarih">
                <input type="datetime-local"
                  value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, colorScheme: 'dark' }}
                />
              </Field>

              {error && (
                <div className="flex items-center gap-2.5 text-sm text-ember-400 rounded-xl px-4 py-3 border border-ember-400" style={{ background: 'rgba(196,99,63,0.1)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3 pt-4 border-t border-ink-700">
              <button onClick={closeForm} className="flex-1 py-3 rounded-xl border border-ink-700 text-ink-300 hover:text-cream-100 text-sm font-medium transition-colors" style={{ background: '#22201a' }}>
                İptal
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-moss-500 hover:bg-moss-400 text-ink-900 text-sm font-semibold transition-all disabled:opacity-50"
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
