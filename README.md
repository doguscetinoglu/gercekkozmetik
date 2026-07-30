# Gerçek Kozmetik — Nakit & Tahsilat Kontrol Sistemi

Cari hesap bakiyelerinin vade durumunu, gönderilen bilgilendirmeleri ve gelen tahsilatları
raporlayan kontrol paneli.

> **Bu bir tanıtım (demo) sistemidir.** Veritabanındaki tüm cari hesaplar, tutarlar ve firma
> isimleri örnek veriden üretilmiştir; gerçek hiçbir şirkete ait değildir. Bildirim gönderimi
> simülasyondur — sistem SMS/WhatsApp/e-posta/arama yapmaz, yalnızca kayıtları raporlar.

## Ne cevaplıyor

- Bir carinin bakiyesi kaç gün geçmiş, ne zaman ve kaç gün gecikmeyle ödemiş
- Toplam vadesi geçen tutar ve bunun **tutarla ağırlıklı** ortalama gecikme günü
- Dönem tahsilatı, vade uyum oranı, temsilci kırılımı
- Günde hangi kanaldan kaç bilgilendirme gitmiş (SMS · WhatsApp · E-posta · Telefon)
- Hangi kanal gerçekten tahsilat getiriyor (bildirim → ödeme dönüşümü)

Her ekran ve her rapor, gösterdiği verinin aynısıyla **PDF olarak indirilir**.

## Ekranlar

| Rota | İçerik |
|---|---|
| `/giris` | Giriş (demo hesabı ekranda yazılı) |
| `/` | Yönetim paneli — KPI'lar, risk şeridi, 30 günlük seyir, en riskli 20 cari |
| `/cariler` | Filtreli cari listesi (segment · şehir · temsilci · gecikme aralığı) |
| `/cariler/[id]` | Cari ekstresi — açık faturalar, ödeme geçmişi, bildirim geçmişi |
| `/bildirimler` | Bildirim kaydı + gün × kanal dağılım matrisi |
| `/tahsilatlar` | Tahsilat listesi ve ödeme yöntemi dağılımı |
| `/raporlar` | Günlük Faaliyet · Cari Yaşlandırma · Bildirim Etkinliği · Tahsilat Performansı |

## Teknik

Next.js 16 (App Router) · React 19 · Prisma 7 + Neon Serverless PostgreSQL · Tailwind CSS v4 ·
jose (oturum) · Recharts · jsPDF.

### Mimari kararlar

**`src/lib/metrics.ts` tek doğruluk kaynağıdır.** Yaşlandırma, ağırlıklı gecikme, vade uyumu ve
bildirim atfı yalnızca burada hesaplanır; ekranlar ve PDF üreticisi aynı fonksiyonları çağırır.
Rapor mantığı bir bileşenin içine yazılırsa panel ile PDF'in rakamları zamanla ayrışır.

**Ağırlıklı gecikme** `Σ(kalan bakiye × gecikme günü) / Σ(kalan bakiye)` ile hesaplanır. Düz
ortalama küçük tutarlı faturalar yüzünden yanıltıcı olur.

**Bildirim atfı** bildirimlerin tamamı üzerinden BİR KEZ hesaplanır (`tahsilatAtiflari`), sonra
kanal ve gecikme aralığına göre gruplanır. Her dilim için ayrı hesaplanırsa her dilim aynı
tahsilatı kendine yazar ve dilim oranlarının toplamı genel oranı aşar.

**PDF client tarafında üretilir.** jsPDF'in standart fontları Türkçe glifleri (ğ ş ı İ) içermez,
bu yüzden IBM Plex alt kümesi base64 olarak gömülür (`src/lib/pdf/font-*.ts`, `await import()`
ile tembel yüklenir — 147KB ilk PDF tıklamasına kadar bundle'a girmez).

### Tasarım dili — "Kasa Defteri"

Finansal broadsheet: gölge yok, yuvarlak köşe yok, dekoratif renk yok. Yapı 1px saç
çizgilerinden gelir; hiyerarşi tipografiyle kurulur. Rakamlar IBM Plex Mono ve `tabular-nums`.
Renk yalnızca **durum sinyali** taşır (zamanında / 1-30 / 31-60 / 60+) ve durum asla yalnız
renkle anlatılmaz — her zaman yanında metin etiketi vardır. Palet WCAG AA için ölçülmüştür.

## Kurulum

```bash
npm install
cp .env.example .env      # DATABASE_URL ve SESSION_SECRET doldurulur
npm run db:push           # şemayı veritabanına uygula
npm run db:seed           # örnek veriyi üret (deterministik)
npm run dev
```

### Komutlar

| Komut | İş |
|---|---|
| `npm run db:seed` | Demo verisini yeniden üretir — sabit tohumlu, her çalıştırmada aynı sonuç |
| `npm run kontrol` | Rapor tutarlılık denetimi (11 değişmez: kova toplamları, atıf çift sayımı vb.) |
| `npm run db:font` | PDF fontlarını IBM Plex kaynağından yeniden üretir (nadiren gerekir) |

Demo verisi rastgele gürültü değil bir **davranış modelidir**: her cariye ödeme disiplini profili
atanır, gecikme büyüdükçe bildirim kanalı sertleşir (SMS → WhatsApp → E-posta → Telefon) ve
disiplinli cariler bildirimden 1-5 gün sonra öder. Etkinlik raporunun anlamlı çıkması buna bağlı.

## Demo erişimi

Kullanıcı adı `demo` · Şifre `kozmetik2026`
