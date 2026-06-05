'use client'

import { useState, useEffect } from 'react'
import { Plus, Instagram, Facebook, Twitter, Youtube, X, Calendar, Image, Video, Send, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

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
const MEDIA_TYPES = ['image', 'video']
const BRANDS = ['Milgo', 'Donna']

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: 'Bekliyor', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  scheduled: { label: 'Planlandı', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  published: { label: 'Yayınlandı', color: 'bg-moss-500/20 text-moss-300 border-moss-500/30' },
  failed: { label: 'Hatalı', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="w-4 h-4" />,
  Facebook: <Facebook className="w-4 h-4" />,
  Twitter: <Twitter className="w-4 h-4" />,
  YouTube: <Youtube className="w-4 h-4" />,
  TikTok: <Video className="w-4 h-4" />,
  LinkedIn: <Send className="w-4 h-4" />,
}

const empty = {
  brand: 'Milgo',
  platform: 'Instagram',
  media_url: '',
  media_type: 'image',
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

  async function load() {
    setLoading(true)
    const r = await fetch('/api/omni')
    const d = await r.json()
    setPosts(d.posts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit() {
    if (!form.media_url) { setError('Medya URL zorunlu'); return }
    setSaving(true)
    setError('')
    const r = await fetch('/api/omni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        scheduled_at: form.scheduled_at || null,
      }),
    })
    const d = await r.json()
    if (d.error) { setError(d.error); setSaving(false); return }
    setShowForm(false)
    setForm(empty)
    load()
    setSaving(false)
  }

  async function updateStatus(id: number, status: string) {
    await fetch('/api/omni', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  const counts = {
    all: posts.length,
    pending: posts.filter(p => p.status === 'pending').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-cream-50">Paylaşım Planla</h1>
          <p className="text-sm text-ink-400 mt-0.5">Sosyal medya içeriklerini planla ve yönet</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-moss-600 hover:bg-moss-500 text-cream-50 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Paylaşım
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'pending', label: 'Bekliyor' },
          { key: 'scheduled', label: 'Planlandı' },
          { key: 'published', label: 'Yayınlandı' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${filter === f.key ? 'bg-moss-700 text-cream-50' : 'bg-ink-800 text-ink-300 hover:text-cream-50'}`}
          >
            {f.label}
            <span className="text-[11px] bg-ink-700 px-1.5 py-0.5 rounded-full">{counts[f.key as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-ink-400 border border-dashed border-ink-700 rounded-2xl">
          <Send className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Henüz paylaşım yok</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(post => (
            <div key={post.id} className="bg-ink-800 border border-ink-700 rounded-2xl p-4 flex items-start gap-4">
              {/* Medya önizleme */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-ink-700 shrink-0 flex items-center justify-center">
                {post.media_url ? (
                  post.media_type === 'image'
                    ? <img src={post.media_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                    : <Video className="w-6 h-6 text-ink-400" />
                ) : <Image className="w-6 h-6 text-ink-400" />}
              </div>

              {/* Bilgi */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1.5 text-xs text-ink-300 bg-ink-700 px-2 py-1 rounded-lg">
                    {PLATFORM_ICON[post.platform] || <Send className="w-3 h-3" />}
                    {post.platform}
                  </span>
                  <span className="text-xs text-ink-400 bg-ink-700 px-2 py-1 rounded-lg">{post.post_type}</span>
                  <span className="text-xs text-ink-400 bg-ink-700 px-2 py-1 rounded-lg">{post.brand}</span>
                  <span className={`text-xs px-2 py-1 rounded-lg border ${STATUS_BADGE[post.status]?.color || 'bg-ink-700 text-ink-300'}`}>
                    {STATUS_BADGE[post.status]?.label || post.status}
                  </span>
                </div>
                {post.title && <p className="text-sm font-medium text-cream-100 truncate">{post.title}</p>}
                {post.caption && <p className="text-xs text-ink-300 truncate mt-0.5">{post.caption}</p>}
                {post.hashtags && <p className="text-xs text-moss-400 truncate mt-0.5">{post.hashtags}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {post.scheduled_at && (
                    <span className="flex items-center gap-1 text-[11px] text-ink-400">
                      <Clock className="w-3 h-3" />
                      {new Date(post.scheduled_at).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </span>
                  )}
                  <span className="text-[11px] text-ink-500">
                    {new Date(post.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>

              {/* Aksiyon */}
              {post.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => updateStatus(post.id, 'scheduled')}
                    title="Planla"
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateStatus(post.id, 'published')}
                    title="Yayınlandı"
                    className="p-2 rounded-lg bg-moss-500/20 text-moss-300 hover:bg-moss-500/40 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700">
              <h2 className="text-lg font-display font-semibold text-cream-50">Yeni Paylaşım</h2>
              <button onClick={() => { setShowForm(false); setError('') }} className="text-ink-400 hover:text-cream-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Brand & Platform */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-400 mb-1.5 block">Marka *</label>
                  <select
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 focus:outline-none focus:border-moss-500"
                  >
                    {BRANDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink-400 mb-1.5 block">Platform *</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 focus:outline-none focus:border-moss-500"
                  >
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Media Type & Post Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-400 mb-1.5 block">Medya Türü *</label>
                  <div className="flex gap-2">
                    {MEDIA_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, media_type: t }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm border transition-colors ${form.media_type === t ? 'border-moss-500 bg-moss-700/30 text-moss-300' : 'border-ink-700 bg-ink-800 text-ink-400 hover:text-cream-50'}`}
                      >
                        {t === 'image' ? <Image className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                        {t === 'image' ? 'Resim' : 'Video'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-ink-400 mb-1.5 block">İçerik Türü</label>
                  <select
                    value={form.post_type}
                    onChange={e => setForm(f => ({ ...f, post_type: e.target.value }))}
                    className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 focus:outline-none focus:border-moss-500"
                  >
                    {POST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Media URL */}
              <div>
                <label className="text-xs text-ink-400 mb-1.5 block">Medya URL *</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.media_url}
                  onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 placeholder-ink-500 focus:outline-none focus:border-moss-500"
                />
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-ink-400 mb-1.5 block">Başlık</label>
                <input
                  type="text"
                  placeholder="Paylaşım başlığı..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 placeholder-ink-500 focus:outline-none focus:border-moss-500"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs text-ink-400 mb-1.5 block">Açıklama</label>
                <textarea
                  rows={3}
                  placeholder="Post açıklaması..."
                  value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 placeholder-ink-500 focus:outline-none focus:border-moss-500 resize-none"
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-xs text-ink-400 mb-1.5 block">Hashtag'ler</label>
                <input
                  type="text"
                  placeholder="#milgo #çiğsüt #istanbul"
                  value={form.hashtags}
                  onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 placeholder-ink-500 focus:outline-none focus:border-moss-500"
                />
              </div>

              {/* Scheduled At */}
              <div>
                <label className="text-xs text-ink-400 mb-1.5 block">Planlanan Tarih</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full bg-ink-800 border border-ink-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 focus:outline-none focus:border-moss-500"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowForm(false); setError('') }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-ink-700 text-ink-300 hover:text-cream-50 text-sm transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-moss-600 hover:bg-moss-500 text-cream-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
