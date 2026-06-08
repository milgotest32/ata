'use client'

import { useState, useEffect } from 'react'
import { Plus, X, AlertCircle, Loader2, Send, ImageIcon, Video, RefreshCw, CheckCircle2, ExternalLink, Trash2, Pencil } from 'lucide-react'

type OmniPost = {
  id: number
  brand: string
  platform: string
  status: string
  media_url: string
  cloudinary_url: string | null
  media_type: string
  post_type: string | null
  title: string | null
  caption: string | null
  hashtags: string | null
  created_at: string
}

// n8n'in beklediği platform değerleri (büyük/küçük harf önemli)
const PLATFORMS = [
  { label: 'Instagram', value: 'instagram', bg: '#E1306C', text: '#fff', mediaType: null,    postType: true  },
  { label: 'YouTube',   value: 'YouTube',   bg: '#FF0000', text: '#fff', mediaType: 'video', postType: false },
  { label: 'Pinterest', value: 'Pinterest', bg: '#E60023', text: '#fff', mediaType: 'resim', postType: false },
  { label: 'TikTok',   value: 'TikTok',    bg: '#010101', text: '#fff', mediaType: 'video', postType: false },
]

const PLT_BY_VALUE: Record<string, typeof PLATFORMS[0]> = Object.fromEntries(PLATFORMS.map(p => [p.value, p]))
const PLT_LABEL: Record<string, string> = Object.fromEntries(PLATFORMS.map(p => [p.value, p.label]))

const POST_TYPES = ['post', 'story', 'reel']

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  bekliyor: { label: 'Bekliyor', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  yuklendi: { label: 'Yayında',  bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  hata:     { label: 'Hatalı',   bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
}

const emptyForm = {
  platform: 'instagram',
  media_url: '',
  media_type: 'resim',
  post_type: 'post',
  title: '',
  caption: '',
  hashtags: '',
}

const inputCls = "w-full rounded-lg px-3 py-2.5 text-sm border border-gray-200 focus:border-moss-500 focus:ring-1 focus:ring-moss-500 outline-none transition-colors text-gray-800 placeholder-gray-400"

export default function PaylasimPage() {
  const [posts, setPosts] = useState<OmniPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<OmniPost | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/omni')
    const d = await r.json()
    setPosts(d.posts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Platform seçilince medya türünü otomatik ayarla
  function selectPlatform(value: string) {
    const plt = PLT_BY_VALUE[value]
    setForm(f => ({
      ...f,
      platform: value,
      media_type: plt.mediaType || f.media_type,
      post_type: plt.postType ? f.post_type : 'post',
    }))
  }

  function openNew() { setEditingPost(null); setForm(emptyForm); setError(''); setShowForm(true) }

  function openEdit(post: OmniPost) {
    setEditingPost(post)
    setForm({
      platform: post.platform,
      media_url: post.media_url,
      media_type: post.media_type,
      post_type: post.post_type || 'post',
      title: post.title || '',
      caption: post.caption || '',
      hashtags: post.hashtags || '',
    })
    setError(''); setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditingPost(null); setForm(emptyForm); setError('') }

  async function handleSubmit() {
    if (!form.media_url) { setError('Medya URL zorunlu'); return }
    setSaving(true); setError('')
    const plt = PLT_BY_VALUE[form.platform]
    const payload = {
      ...form,
      brand: 'Milgo',
      media_type: plt.mediaType || form.media_type,
      post_type: plt.postType ? form.post_type : null,
    }
    const r = await fetch('/api/omni', {
      method: editingPost ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPost ? { id: editingPost.id, ...payload } : payload),
    })
    const d = await r.json()
    if (d.error) { setError(d.error); setSaving(false); return }
    closeForm(); load(); setSaving(false)
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    await fetch(`/api/omni?id=${id}`, { method: 'DELETE' })
    setConfirmDelete(null); setDeletingId(null); load()
  }

  async function updateStatus(id: number, status: string) {
    await fetch('/api/omni', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const counts = {
    all:      posts.length,
    bekliyor: posts.filter(p => p.status === 'bekliyor').length,
    yuklendi: posts.filter(p => p.status === 'yuklendi').length,
  }
  const filtered = posts
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => platformFilter === 'all' || p.platform === platformFilter)

  const currentPlt = PLT_BY_VALUE[form.platform]

  return (
    <div style={{ background: '#f8f7f4', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-1">OmniSocial</p>
            <h1 className="text-2xl font-display font-semibold text-gray-900">Paylaşım Planla</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 bg-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-moss-600 hover:bg-moss-500 text-white text-sm font-semibold transition-colors shadow-sm">
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Yeni Paylaşım
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { key: 'all',      label: 'Toplam',   active: '#293821', numColor: '#fff',     mutedColor: '#a8b885' },
            { key: 'bekliyor', label: 'Bekliyor', active: '#fef3c7', numColor: '#92400e',  mutedColor: '#92400e' },
            { key: 'yuklendi', label: 'Yayında',  active: '#dcfce7', numColor: '#166534',  mutedColor: '#166534' },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className="rounded-xl p-4 text-left border transition-all"
              style={{ background: filter === s.key ? s.active : '#fff', borderColor: filter === s.key ? 'transparent' : '#e5e7eb', boxShadow: filter === s.key ? 'none' : '0 1px 2px rgba(0,0,0,0.04)' }}>
              <div className="text-2xl font-display font-bold" style={{ color: filter === s.key ? s.numColor : '#111827' }}>
                {counts[s.key as keyof typeof counts]}
              </div>
              <div className="text-xs mt-1 font-medium" style={{ color: filter === s.key ? s.mutedColor : '#6b7280' }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Platform filtre */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setPlatformFilter('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={{ background: platformFilter === 'all' ? '#293821' : '#fff', color: platformFilter === 'all' ? '#fff' : '#6b7280', borderColor: platformFilter === 'all' ? 'transparent' : '#e5e7eb' }}>
            Tüm Platformlar
          </button>
          {PLATFORMS.map(p => (
            <button key={p.value} onClick={() => setPlatformFilter(p.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{ background: platformFilter === p.value ? p.bg : '#fff', color: platformFilter === p.value ? p.text : '#6b7280', borderColor: platformFilter === p.value ? 'transparent' : '#e5e7eb' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Tablo */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="grid px-5 py-3 border-b border-gray-100 bg-gray-50" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px' }}>
            {['İçerik', 'Platform', 'Tür', 'Medya', 'Durum', ''].map((h, i) => (
              <div key={i} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Yükleniyor</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Send className="w-6 h-6 text-gray-300" />
              <p className="text-sm text-gray-500">Paylaşım yok</p>
              <button onClick={openNew} className="text-xs text-moss-600 font-medium underline underline-offset-2">Yeni ekle</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(post => {
                const st = STATUS_STYLE[post.status] || STATUS_STYLE.bekliyor
                const plt = PLT_BY_VALUE[post.platform] || PLATFORMS[0]
                return (
                  <div key={post.id} className="group relative">
                    {confirmDelete === post.id && (
                      <div className="absolute inset-0 bg-red-50 border-y border-red-100 z-10 flex items-center justify-between px-5">
                        <p className="text-sm font-medium text-red-700">Silinsin mi?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm bg-white">İptal</button>
                          <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50">
                            {deletingId === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Sil
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="grid px-5 py-4 items-center hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px' }}>
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                          {post.media_url
                            ? <img src={post.cloudinary_url || post.media_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                            : post.media_type === 'video' ? <Video className="w-4 h-4 text-gray-400" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{post.title || '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{post.caption || post.hashtags || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold" style={{ background: plt.bg, color: plt.text }}>
                          {PLT_LABEL[post.platform] || post.platform}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
                          {post.post_type || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
                          {post.media_type}
                        </span>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: st.bg, color: st.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {post.status === 'bekliyor' && (
                          <button onClick={() => updateStatus(post.id, 'yuklendi')} title="Yayınlandı"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-moss-600 hover:bg-moss-50 transition-colors">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {post.media_url && (
                          <a href={post.media_url} target="_blank" rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => openEdit(post)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(post.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {filtered.length > 0 && <p className="text-xs text-gray-400 mt-3 px-1">{filtered.length} kayıt</p>}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeForm() }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-0.5">OmniSocial</p>
                <h2 className="text-lg font-display font-semibold text-gray-900">{editingPost ? 'Düzenle' : 'Yeni Paylaşım'}</h2>
              </div>
              <button onClick={closeForm} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">

              {/* Platform */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Platform</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p.value} onClick={() => selectPlatform(p.value)}
                      className="py-2.5 rounded-lg text-sm font-semibold border-2 transition-all"
                      style={{ background: form.platform === p.value ? p.bg : '#fff', color: form.platform === p.value ? p.text : '#374151', borderColor: form.platform === p.value ? p.bg : '#e5e7eb' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instagram'a özel: İçerik türü + Medya türü */}
              {currentPlt?.postType && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">İçerik Türü</p>
                    <div className="flex gap-1.5">
                      {POST_TYPES.map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, post_type: t }))}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all capitalize"
                          style={{ background: form.post_type === t ? '#293821' : '#fff', color: form.post_type === t ? '#a8b885' : '#374151', borderColor: form.post_type === t ? '#293821' : '#e5e7eb' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Medya Türü</p>
                    <div className="flex gap-1.5">
                      {[{ v: 'resim', l: 'Resim' }, { v: 'video', l: 'Video' }].map(t => (
                        <button key={t.v} onClick={() => setForm(f => ({ ...f, media_type: t.v }))}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border-2 transition-all"
                          style={{ background: form.media_type === t.v ? '#293821' : '#fff', color: form.media_type === t.v ? '#a8b885' : '#374151', borderColor: form.media_type === t.v ? '#293821' : '#e5e7eb' }}>
                          {t.v === 'resim' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Medya türü bilgi etiketi (Instagram dışı) */}
              {!currentPlt?.postType && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  {currentPlt?.mediaType === 'video' ? <Video className="w-4 h-4 text-gray-400" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                  <span className="text-xs text-gray-500 font-medium">
                    {currentPlt?.label} sadece <strong>{currentPlt?.mediaType === 'video' ? 'video' : 'resim'}</strong> kabul eder
                  </span>
                </div>
              )}

              {/* Medya URL */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Medya URL (Google Drive) *</p>
                <input type="url" placeholder="https://drive.google.com/..." value={form.media_url}
                  onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} className={inputCls} />
              </div>

              {/* Başlık — YouTube için zorunlu */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Başlık {form.platform === 'YouTube' && <span className="text-red-400">*</span>}
                </p>
                <input type="text" placeholder="Paylaşım başlığı..." value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
              </div>

              {/* Açıklama */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Açıklama {form.platform !== 'YouTube' && <span className="text-gray-400 font-normal normal-case">(caption olarak kullanılır)</span>}
                </p>
                <textarea rows={3} placeholder="Post açıklaması..." value={form.caption}
                  onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Hashtag */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hashtag'ler</p>
                <input type="text" placeholder="#milgo #çiğsüt #istanbul" value={form.hashtags}
                  onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} className={inputCls} />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-4 flex gap-3 border-t border-gray-100">
              <button onClick={closeForm} className="flex-1 py-2.5 rounded-lg border-2 border-gray-200 text-gray-600 text-sm font-semibold transition-colors">İptal</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-moss-600 hover:bg-moss-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {saving ? 'Kaydediliyor...' : editingPost ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
