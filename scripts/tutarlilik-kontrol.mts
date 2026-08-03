/**
 * Rapor tutarlılık denetimi.
 *
 * Panel ve PDF aynı fonksiyonları kullandığı için rakamların ayrışması
 * beklenmez; buradaki kontroller o varsayımı SINAR. Özellikle atıf mantığı
 * kırılgan: dilim bazında yeniden hesaplanırsa dilim toplamları geneli aşar.
 *
 * Kullanım: npx tsx scripts/tutarlilik-kontrol.mts
 */
import 'dotenv/config'
import {
  dashboardVerisi,
  etkinlikRaporu,
  filtreSecenekleri,
  yaslandirmaRaporu,
  performansRaporu,
  tahsilatSayfasi,
  temsilciUyarilari,
} from '../src/lib/queries'

let hata = 0

function kontrol(ad: string, kosul: boolean, detay: string) {
  console.log(`${kosul ? '✓' : '✗'} ${ad}${kosul ? '' : ` — ${detay}`}`)
  if (!kosul) hata++
}

/** Kuruş yuvarlamaları için küçük tolerans. */
const yakin = (a: number, b: number, tolerans = 1) => Math.abs(a - b) <= tolerans

const panel = await dashboardVerisi()
const yasl = await yaslandirmaRaporu()
const etki = await etkinlikRaporu('2026-07-01', '2026-07-30')
const perf = await performansRaporu('2026-07-01', '2026-07-30')
const uyariTum = await temsilciUyarilari()

// 1) Yaşlandırma kovalarının toplamı açık bakiyeye eşit olmalı
const kovaToplam = panel.kovalar.reduce((t, k) => t + k.tutar, 0)
kontrol(
  'Yaşlandırma kovaları = açık bakiye',
  yakin(kovaToplam, panel.ozet.acikBakiye),
  `kovalar ${kovaToplam} ≠ bakiye ${panel.ozet.acikBakiye}`,
)

// 2) Vadesi geçen + vadesi gelmemiş = açık bakiye
kontrol(
  'Vadesi geçen + gelmemiş = açık bakiye',
  yakin(panel.ozet.vadesiGecen + panel.ozet.vadesiGelmemis, panel.ozet.acikBakiye),
  'toplam tutmuyor',
)

// 3) Panel ve yaşlandırma raporu aynı özeti vermeli (iki farklı sorgu yolu)
kontrol(
  'Panel özeti = yaşlandırma raporu özeti',
  yakin(panel.ozet.acikBakiye, yasl.ozet.acikBakiye) &&
    yakin(panel.ozet.vadesiGecen, yasl.ozet.vadesiGecen) &&
    panel.ozet.agirlikliGecikmeGunu === yasl.ozet.agirlikliGecikmeGunu,
  `panel ${panel.ozet.acikBakiye}/${panel.ozet.agirlikliGecikmeGunu}g vs rapor ${yasl.ozet.acikBakiye}/${yasl.ozet.agirlikliGecikmeGunu}g`,
)

// 4) Segment kırılımı toplamı genel toplama eşit olmalı
const segToplam = yasl.segmentSatirlari.reduce((t, s) => t + s.acikBakiye, 0)
kontrol(
  'Segment kırılımı = açık bakiye',
  yakin(segToplam, yasl.ozet.acikBakiye),
  `segmentler ${segToplam} ≠ ${yasl.ozet.acikBakiye}`,
)

// 5) KRİTİK: etkinlik raporunda kanal toplamı = aralık toplamı
//    Atıf dilim başına yeniden hesaplanırsa bu kontrol patlar.
const kanalDonusen = etki.kanallar.reduce((t, k) => t + k.donusen, 0)
const aralikDonusen = etki.aralikSatirlari.reduce((t, a) => t + a.donusen, 0)
kontrol(
  'Etkinlik: kanal dönüşen = aralık dönüşen',
  kanalDonusen === aralikDonusen,
  `kanal ${kanalDonusen} ≠ aralık ${aralikDonusen} (atıf çift sayılıyor)`,
)

const kanalTutar = etki.kanallar.reduce((t, k) => t + k.atfedilenTutar, 0)
const aralikTutar = etki.aralikSatirlari.reduce((t, a) => t + a.atfedilenTutar, 0)
kontrol(
  'Etkinlik: kanal atfedilen = aralık atfedilen',
  yakin(kanalTutar, aralikTutar),
  `kanal ${kanalTutar} ≠ aralık ${aralikTutar}`,
)

// 6) Gönderim sayıları da bölünmeyi doğrulamalı
const kanalGonderim = etki.kanallar.reduce((t, k) => t + k.gonderim, 0)
const aralikGonderim = etki.aralikSatirlari.reduce((t, a) => t + a.gonderim, 0)
kontrol(
  'Etkinlik: gönderim toplamları eşit',
  kanalGonderim === aralikGonderim && kanalGonderim === etki.toplamBildirim,
  `kanal ${kanalGonderim} / aralık ${aralikGonderim} / toplam ${etki.toplamBildirim}`,
)

// 7) Dönüşen sayısı gönderimden büyük olamaz
kontrol(
  'Etkinlik: dönüşen ≤ gönderim (her kanal)',
  etki.kanallar.every((k) => k.donusen <= k.gonderim),
  'bir kanalda dönüşen gönderimi aşıyor',
)

// 8) Performans: cari bazlı tahsilat toplamı = dönem tahsilatı
const cariTahsilat = perf.cariSatirlari.reduce((t, c) => t + c.tahsilat, 0)
kontrol(
  'Performans: cari toplamı = dönem tahsilatı',
  yakin(cariTahsilat, perf.donemTahsilat),
  `cariler ${cariTahsilat} ≠ dönem ${perf.donemTahsilat}`,
)

// 9) Performans: temsilci kırılımı = dönem tahsilatı
const temsilciTahsilat = perf.temsilciler.reduce((t, x) => t + x.tutar, 0)
kontrol(
  'Performans: temsilci kırılımı = dönem tahsilatı',
  yakin(temsilciTahsilat, perf.donemTahsilat),
  `temsilciler ${temsilciTahsilat} ≠ dönem ${perf.donemTahsilat}`,
)

// 10) Oranlar mantıklı aralıkta
kontrol(
  'Vade uyumu %0-100 arasında',
  panel.vadeUyumu >= 0 && panel.vadeUyumu <= 100,
  `%${panel.vadeUyumu}`,
)

// 11) Uyarı ekranı: temsilci kırılımlarının toplamı genel listeye eşit olmalı.
//     Portföy filtresi cariyi eleyip uyarıyı elemezse buradan görünür.
const temsilciAdlari = [...new Set(uyariTum.satirlar.map((s) => s.temsilci))]
const uyariKirilim = await Promise.all(temsilciAdlari.map((t) => temsilciUyarilari(t)))
const kirilimAdedi = uyariKirilim.reduce((t, u) => t + u.satirlar.length, 0)
kontrol(
  'Uyarı: temsilci kırılımı = genel uyarı listesi',
  kirilimAdedi === uyariTum.satirlar.length,
  `kırılım ${kirilimAdedi} ≠ genel ${uyariTum.satirlar.length}`,
)

// 12) Uyarı listesindeki vadesi geçen tutar, portföyün vadesi geçen tutarını
//     aşamaz — aşıyorsa bir cari birden fazla kez listeye girmiş demektir.
const uyariGecen = uyariTum.satirlar.reduce((t, s) => t + s.vadesiGecen, 0)
kontrol(
  'Uyarı: vadesi geçen ≤ genel vadesi geçen',
  uyariGecen <= panel.ozet.vadesiGecen + 1,
  `uyarı ${uyariGecen} > panel ${panel.ozet.vadesiGecen}`,
)

// 13) Tahsilat listesi filtresi: temsilci kırılımlarının toplamı tüm kayıtlara
//     eşit olmalı. Süzme ile sayfalama bellekte yapıldığı için bu kontrol,
//     filtrenin kayıt düşürmediğini/çoğaltmadığını doğrular.
const { temsilciler } = await filtreSecenekleri()
const tahsilatKirilim = await Promise.all(
  temsilciler.map((t) => tahsilatSayfasi({ temsilci: t, sayfaBoyu: 1 })),
)
const kirilimTutar = tahsilatKirilim.reduce((t, x) => t + x.suzulmusToplam, 0)
const tumTahsilat = await tahsilatSayfasi({ sayfaBoyu: 1 })
kontrol(
  'Tahsilat: temsilci filtresi kırılımı = genel toplam',
  yakin(kirilimTutar, tumTahsilat.genelToplam) &&
    tahsilatKirilim.reduce((t, x) => t + x.toplam, 0) === tumTahsilat.kayitAdedi,
  `kırılım ${kirilimTutar} ≠ genel ${tumTahsilat.genelToplam}`,
)

// 14) Sebepsiz cari listeye girmemeli; her satırın seviyesi bir sebepten gelir.
kontrol(
  'Uyarı: her satırın en az bir sebebi var',
  uyariTum.satirlar.every((s) => s.sebepler.length > 0 && s.skor > 0),
  'sebepsiz satır var',
)

console.log(
  `\n${hata === 0 ? '✓ Tüm tutarlılık kontrolleri geçti' : `✗ ${hata} kontrol başarısız`}`,
)
process.exit(hata === 0 ? 0 : 1)
