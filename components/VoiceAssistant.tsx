'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, X, Volume2, Loader2 } from 'lucide-react'

type Mesaj = { rol: 'user' | 'assistant'; metin: string }

const SAYFA_KOMUTLARI: Record<string, string> = {
  'genel bakış': '/', 'ana sayfa': '/', 'dashboard': '/',
  'konuşmalar': '/konusmalar', 'mesajlar': '/konusmalar',
  'canlı destek': '/canli-destek', 'destek': '/canli-destek',
  'siparişler': '/siparisler', 'sipariş': '/siparisler',
  'müşteriler': '/musteriler', 'müşteri': '/musteriler',
  'satış': '/satis', 'satışlar': '/satis',
  'abonelikler': '/abonelikler', 'abonelik': '/abonelikler',
  'ödemeler': '/odemeler', 'ödeme': '/odemeler',
  'muhasebe': '/muhasebe',
  'harita': '/harita', 'teslimat': '/harita',
  'çalışma': '/calisma', 'görevler': '/calisma',
  'takvim': '/takvim',
  'raporlar': '/raporlar', 'rapor': '/raporlar',
  'reklamlar': '/reklamlar', 'reklam': '/reklamlar',
  'kullanıcılar': '/kullanicilar',
}

export default function VoiceAssistant() {
  const [durum, setDurum] = useState<'bekliyor' | 'dinliyor' | 'isleniyor' | 'konusuyor'>('bekliyor')
  const [acik, setAcik] = useState(false)
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([])
  const [sonMesaj, setSonMesaj] = useState('')
  const [hata, setHata] = useState('')
  const [izin, setIzin] = useState(false)
  const router = useRouter()

  const recognitionRef = useRef<any>(null)
  const wakeRecognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const mesajlarRef = useRef<HTMLDivElement>(null)

  // Sesli konuş
  const konuş = useCallback((metin: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(metin)
    utterance.lang = 'tr-TR'
    utterance.rate = 1.1
    utterance.pitch = 1
    utterance.onstart = () => setDurum('konusuyor')
    utterance.onend = () => setDurum('dinliyor')
    synthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  // Dashboard verisi çek ve Claude'a sor
  const soruy = useCallback(async (soru: string) => {
    setDurum('isleniyor')

    // Sayfa yönlendirme kontrolü
    const soruLower = soru.toLowerCase()
    for (const [anahtar, link] of Object.entries(SAYFA_KOMUTLARI)) {
      if (soruLower.includes(anahtar) && (soruLower.includes('git') || soruLower.includes('aç') || soruLower.includes('göster'))) {
        router.push(link)
        const cevap = `${anahtar.charAt(0).toUpperCase() + anahtar.slice(1)} sayfasına gidiyorum.`
        setMesajlar(m => [...m, { rol: 'assistant', metin: cevap }])
        konuş(cevap)
        return
      }
    }

    // İlgili veriyi çek
    let veri = ''
    try {
      if (soruLower.includes('sipariş') || soruLower.includes('siparis')) {
        const res = await fetch('/api/shopify/orders')
        const data = await res.json()
        const orders = data.orders || []
        const bugun = new Date().toDateString()
        const bugunOrders = orders.filter((o: any) => new Date(o.created_at).toDateString() === bugun)
        const bekleyen = orders.filter((o: any) => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled')
        veri = `Toplam ${orders.length} sipariş. Bugün ${bugunOrders.length} sipariş. ${bekleyen.length} sipariş hazırlanmayı bekliyor. Son sipariş: ${orders[0]?.name} - ${orders[0]?.customer_name} - ${orders[0]?.total_price} TL.`
      } else if (soruLower.includes('abone') || soruLower.includes('teslimat')) {
        const res = await fetch('/api/aboneliker')
        const data = await res.json()
        const aboneler = data.subs || []
        const aktif = aboneler.filter((a: any) => a.durum === 'abone')
        veri = `Toplam ${aboneler.length} kayıt, ${aktif.length} aktif abone. Haftalık toplam ${aktif.reduce((s: number, a: any) => s + a.haftalik_adet, 0)} adet teslimat.`
      } else if (soruLower.includes('müşteri') || soruLower.includes('konuşma') || soruLower.includes('mesaj')) {
        const { createClient } = await import('@supabase/supabase-js')
        const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
        const { data } = await db.from('wa_sessions').select('phone, last_intent, updated_at').order('updated_at', { ascending: false }).limit(5)
        veri = `Son 5 konuşma: ${(data || []).map((s: any) => `${s.phone} (${s.last_intent || 'belirsiz'})`).join(', ')}.`
      } else if (soruLower.includes('görev') || soruLower.includes('gorev')) {
        const res = await fetch('/api/gorev')
        const data = await res.json()
        const bekleyen = (data.gorevler || []).filter((g: any) => g.durum === 'bekliyor')
        const acil = bekleyen.filter((g: any) => g.oncelik === 'acil')
        veri = `${bekleyen.length} bekleyen görev, ${acil.length} acil. ${bekleyen[0] ? `İlk görev: ${bekleyen[0].baslik}` : ''}`
      } else if (soruLower.includes('gelir') || soruLower.includes('para') || soruLower.includes('muhasebe')) {
        const res = await fetch('/api/shopify/orders')
        const data = await res.json()
        const orders = data.orders || []
        const buAy = new Date()
        const ayBas = new Date(buAy.getFullYear(), buAy.getMonth(), 1)
        const gelir = orders.filter((o: any) => new Date(o.created_at) >= ayBas && o.financial_status === 'paid')
          .reduce((s: number, o: any) => s + parseFloat(o.total_price || 0), 0)
        veri = `Bu ay toplam gelir: ${gelir.toLocaleString('tr')} TL. ${orders.filter((o: any) => o.financial_status === 'paid').length} ödendi sipariş.`
      }
    } catch (e) {
      veri = 'Veri çekilemedi.'
    }

    // Claude API
    try {
      const sistem = `Sen milgo süt çiftliğinin sesli yapay zeka asistanısın. Türkçe konuş, kısa ve net cevap ver (max 2 cümle). Dashboard verisi: ${veri || 'veri yok'}. Kullanıcı adı: Mert.`
      const gecmis = mesajlar.slice(-4).map(m => ({ role: m.rol === 'user' ? 'user' : 'assistant', content: m.metin }))

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          system: sistem,
          messages: [...gecmis, { role: 'user', content: soru }]
        })
      })
      const data = await res.json()
      const cevap = data.content?.[0]?.text || 'Anlayamadım, tekrar söyler misin?'
      setMesajlar(m => [...m, { rol: 'assistant', metin: cevap }])
      konuş(cevap)
    } catch {
      const cevap = 'Bir hata oluştu, tekrar dener misin?'
      setMesajlar(m => [...m, { rol: 'assistant', metin: cevap }])
      konuş(cevap)
    }
  }, [mesajlar, konuş, router])

  // Ana tanıma (asistan açıkken)
  const dinlemeBaslat = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'tr-TR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setDurum('dinliyor')
    recognition.onresult = (e: any) => {
      const metin = e.results[0][0].transcript
      setSonMesaj(metin)
      setMesajlar(m => [...m, { rol: 'user', metin }])
      soruy(metin)
    }
    recognition.onerror = () => setDurum('dinliyor')
    recognition.onend = () => {
      if (durum === 'dinliyor') recognition.start()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [soruy, durum])

  // Wake word dinleyici — sürekli arka planda
  const wakeWordBaslat = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'tr-TR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const metin = e.results[i][0].transcript.toLowerCase()
        if (metin.includes('hey milgo') || metin.includes('ey milgo') || metin.includes('hey milga')) {
          recognition.stop()
          setAcik(true)
          setMesajlar([])
          setTimeout(() => {
            const karsilama = 'Merhaba Mert! Ben Milgo yapay zeka asistanı. Sana nasıl yardımcı olabilirim?'
            setMesajlar([{ rol: 'assistant', metin: karsilama }])
            konuş(karsilama)
          }, 500)
          break
        }
      }
    }

    recognition.onend = () => {
      if (!acik) {
        try { recognition.start() } catch {}
      }
    }
    recognition.onerror = () => {
      setTimeout(() => { try { recognition.start() } catch {} }, 1000)
    }

    wakeRecognitionRef.current = recognition
    try { recognition.start() } catch {}
  }, [acik, konuş])

  // Mikrofon izni al ve wake word başlat
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true }).then(() => {
      setIzin(true)
      wakeWordBaslat()
    }).catch(() => setHata('Mikrofon izni gerekli'))
    return () => {
      wakeRecognitionRef.current?.stop()
      recognitionRef.current?.stop()
      window.speechSynthesis.cancel()
    }
  }, [])

  // Asistan açılınca dinlemeye başla
  useEffect(() => {
    if (acik && izin) {
      setTimeout(() => dinlemeBaslat(), 2000)
    } else {
      recognitionRef.current?.stop()
      window.speechSynthesis.cancel()
      if (!acik && izin) {
        setTimeout(() => wakeWordBaslat(), 500)
      }
    }
  }, [acik])

  // Mesajlar scroll
  useEffect(() => {
    if (mesajlarRef.current) {
      mesajlarRef.current.scrollTop = mesajlarRef.current.scrollHeight
    }
  }, [mesajlar])

  function kapat() {
    setAcik(false)
    setDurum('bekliyor')
    recognitionRef.current?.stop()
    window.speechSynthesis.cancel()
  }

  const DURUM_RENK = { bekliyor: 'bg-ink-400', dinliyor: 'bg-moss-500 animate-pulse', isleniyor: 'bg-cream-400', konusuyor: 'bg-ember-400 animate-pulse' }
  const DURUM_YAZI = { bekliyor: 'Sizi dinliyorum...', dinliyor: 'Konuşun...', isleniyor: 'Düşünüyorum...', konusuyor: 'Konuşuyorum...' }

  return (
    <>
      {/* Wake word göstergesi - sağ alt köşe */}
      {!acik && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all hover:scale-110 ${izin ? 'bg-ink-900' : 'bg-ink-400'}`}
            onClick={() => {
              if (!izin) { navigator.mediaDevices?.getUserMedia({ audio: true }).then(() => { setIzin(true); wakeWordBaslat() }) }
              else { setAcik(true); setTimeout(() => { const k = 'Merhaba Mert! Nasıl yardımcı olabilirim?'; setMesajlar([{ rol: 'assistant', metin: k }]); konuş(k) }, 300) }
            }}
            title={izin ? '"Hey Milgo" deyin veya tıklayın' : 'Mikrofon izni verin'}>
            {izin ? <Mic className="w-5 h-5 text-cream-50" strokeWidth={1.75} /> : <MicOff className="w-5 h-5 text-white" strokeWidth={1.75} />}
          </div>
          {izin && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-moss-500 border-2 border-white animate-pulse" />
          )}
        </div>
      )}

      {/* Asistan paneli */}
      {acik && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-cream-200 overflow-hidden flex flex-col" style={{ maxHeight: '60vh' }}>

          {/* Başlık */}
          <div className="bg-ink-900 px-4 py-3 flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-moss-700 flex items-center justify-center">
                <span className="text-lg">🥛</span>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-ink-900 ${DURUM_RENK[durum]}`} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-cream-50">Milgo Asistan</div>
              <div className="text-[10px] text-ink-400 font-mono">{DURUM_YAZI[durum]}</div>
            </div>
            <button onClick={kapat} className="text-ink-400 hover:text-cream-50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mesajlar */}
          <div ref={mesajlarRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream-50">
            {mesajlar.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  m.rol === 'user' ? 'bg-ink-900 text-cream-50' : 'bg-white border border-cream-200 text-ink-700'
                }`}>
                  {m.metin}
                </div>
              </div>
            ))}
            {durum === 'isleniyor' && (
              <div className="flex justify-start">
                <div className="bg-white border border-cream-200 px-3 py-2 rounded-xl flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-ink-400 animate-spin" />
                  <span className="text-xs text-ink-400">düşünüyorum...</span>
                </div>
              </div>
            )}
          </div>

          {/* Alt bar */}
          <div className="px-4 py-3 border-t border-cream-100 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${DURUM_RENK[durum]}`} />
              <span className="text-xs text-ink-400 font-mono">
                {durum === 'dinliyor' ? 'Sizi dinliyorum' : durum === 'konusuyor' ? 'Konuşuyor' : durum === 'isleniyor' ? 'İşleniyor' : 'Hazır'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {durum === 'konusuyor' && (
                <button onClick={() => window.speechSynthesis.cancel()} className="text-xs text-ink-400 hover:text-ink-700 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />Sustur
                </button>
              )}
              {durum !== 'isleniyor' && durum !== 'konusuyor' && (
                <button onClick={dinlemeBaslat} className="text-xs text-moss-600 hover:text-moss-700 flex items-center gap-1">
                  <Mic className="w-3 h-3" />Konuş
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {hata && (
        <div className="fixed bottom-24 right-6 z-50 bg-ember-50 border border-ember-200 rounded-xl px-4 py-3 text-sm text-ember-700 max-w-xs">
          {hata}
        </div>
      )}
    </>
  )
}
