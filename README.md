# Milgo Admin Panel

WhatsApp bot, Shopify ve abonelik sistemlerinin tek bir yerden yönetildiği admin panel.

## Özellikler

- **Genel Bakış** — Aktif konuşma, KVKK oranı, canlı destek kuyruğu, son 24 saat trafiği
- **Konuşmalar** — Tüm müşteri oturumları, filtreleme, detay drawer
- **Canlı Destek** — Aktif kuyruk, bekleme süresi, bot moduna alma butonu
- **Siparişler** — Shopify'dan canlı sipariş listesi, ödeme/kargo durumu
- **Abonelikler** — Aktif abonelikler, aylık tekrarlı gelir hesabı
- **Raporlar** — 14 günlük trafik, niyet dağılımı, cevaplanamayan mesajlar

## Hızlı Başlangıç

### 1. Bağımlılıkları yükle

```bash
npm install
```

### 2. Environment variables ayarla

`.env.example` dosyasını `.env.local` olarak kopyala ve değerleri doldur:

```bash
cp .env.example .env.local
```

Gereken değerler:

- **NEXT_PUBLIC_SUPABASE_URL** — Supabase projen URL'i
- **NEXT_PUBLIC_SUPABASE_ANON_KEY** — Supabase Settings → API → anon public key
- **SHOPIFY_STORE_DOMAIN** — Shopify mağaza domaini (örn: t7hkbx-nk.myshopify.com)
- **SHOPIFY_ADMIN_TOKEN** — Shopify Admin API access token
- **ADMIN_PASSWORD** — Admin paneline giriş şifresi (sen belirle, en az 8 karakter)

### 3. Geliştirme modu

```bash
npm run dev
```

http://localhost:3000 adresinde açılır.

### 4. Production build

```bash
npm run build
npm start
```

## Vercel'e Deploy

### Adım 1: GitHub'a yükle

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI/milgo-admin.git
git push -u origin main
```

### Adım 2: Vercel'e bağla

1. [vercel.com](https://vercel.com)'a gir, GitHub ile giriş yap
2. **New Project** → repo'yu seç
3. **Environment Variables** bölümüne `.env.example`'daki tüm değişkenleri ekle
4. **Deploy** bas

### Adım 3: Custom domain bağla

1. Vercel projesinde **Settings → Domains**
2. **Add** → kendi domain'ini yaz (örn: `admin.milgo.com.tr`)
3. Vercel sana iki kayıt verir (genelde A veya CNAME)
4. Domain sağlayıcına (Hostinger / GoDaddy / Cloudflare) gir, DNS ayarlarına git
5. Vercel'in verdiği kayıtları ekle:
   - Type: **A**, Name: **admin**, Value: `76.76.21.21`
   - VEYA Type: **CNAME**, Name: **admin**, Value: `cname.vercel-dns.com`
6. DNS yayılması 5-30 dakika sürer
7. Vercel otomatik SSL sertifikası kurar

## Güvenlik

- `ADMIN_PASSWORD` ortam değişkeni ile basit korumalı giriş
- Cookie 7 gün geçerli, sonra tekrar giriş ister
- Tüm API çağrıları server-side (Shopify token client'a sızmaz)
- Supabase RLS açıksa anon key güvenli

## Veritabanı Şeması

Supabase'de gerekli tablolar:

```sql
-- Ana session tablosu (mevcut)
wa_sessions (phone, bulundugu_menu, last_intent, pending_action, kvkk_onay, kvkk_onay_tarihi, musteri_yazdigi, slack_thread_ts, last_products, created_at, updated_at)

-- Aboneler tablosu (opsiyonel — eğer Google Sheets yerine Supabase'e geçilecekse)
aboneler (id, ad, soyad, haftalik_adet, iletisim, urun, fiyat_tekil, durum, created_at)
```

## Tasarım Sistemi

- **Display font**: Fraunces (başlıklar)
- **Body font**: Geist (gövde metni)
- **Mono font**: JetBrains Mono (kod, telefon numaraları)
- **Renkler**:
  - Cream (krem tonları) — arka plan
  - Moss (yeşil) — başarı, aktif, marka rengi
  - Ember (turuncu) — uyarı, acil
  - Ink (siyah tonları) — metin

## Notlar

- Dashboard her 30 saniyede otomatik yenilenir
- Canlı destek sayfası her 15 saniyede yenilenir
- Mobil uyumlu (responsive)
