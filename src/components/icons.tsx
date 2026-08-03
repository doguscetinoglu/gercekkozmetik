/**
 * İkon seti — SF Symbols dilinde çizildi.
 *
 * Kurallar: 24×24 kutu, 1.6px kontur, yuvarlak uç ve birleşim, dolgu yok.
 * Hepsi `currentColor` kullanır; renk dışarıdan verilir.
 *
 * Emoji ikon KULLANILMAZ — hizalaması bozuk, platformdan platforma değişir ve
 * renk kontrolü yoktur.
 */

type IkonProps = {
  /** Kenar uzunluğu (px). SF Symbols gibi 17-22 arası iyi durur. */
  boyut?: number
  className?: string
}

/** Tüm ikonların paylaştığı sarmalayıcı. */
function Ikon({
  boyut = 20,
  className,
  children,
}: IkonProps & { children: React.ReactNode }) {
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Panel — square.grid.2x2 */
export const IkonPanel = (p: IkonProps) => (
  <Ikon {...p}>
    <rect x="3.75" y="3.75" width="7" height="7" rx="2.1" />
    <rect x="13.25" y="3.75" width="7" height="7" rx="2.1" />
    <rect x="3.75" y="13.25" width="7" height="7" rx="2.1" />
    <rect x="13.25" y="13.25" width="7" height="7" rx="2.1" />
  </Ikon>
)

/** Cari hesaplar — person.2 */
export const IkonCari = (p: IkonProps) => (
  <Ikon {...p}>
    <circle cx="9.25" cy="8.25" r="3.25" />
    <path d="M3.5 19.75c0-3.18 2.57-5.25 5.75-5.25s5.75 2.07 5.75 5.25" />
    <path d="M16.25 5.4a3 3 0 0 1 0 5.85" />
    <path d="M17.4 14.9c1.95.62 3.35 2.3 3.35 4.85" />
  </Ikon>
)

/** Bildirimler — bell */
export const IkonBildirim = (p: IkonProps) => (
  <Ikon {...p}>
    <path d="M18.1 9.4a6.1 6.1 0 1 0-12.2 0c0 4.35-1.55 5.6-2.15 6.25a.7.7 0 0 0 .5 1.2h15.5a.7.7 0 0 0 .5-1.2c-.6-.65-2.15-1.9-2.15-6.25Z" />
    <path d="M9.9 19.75a2.45 2.45 0 0 0 4.2 0" />
  </Ikon>
)

/** Tahsilatlar — tray.and.arrow.down (gelen para) */
export const IkonTahsilat = (p: IkonProps) => (
  <Ikon {...p}>
    <path d="M12 3.5v8.75" />
    <path d="M8.6 8.9 12 12.3l3.4-3.4" />
    <path d="M3.5 14.75h4.3l1.35 2.1h5.7l1.35-2.1h4.3v2.6a3.15 3.15 0 0 1-3.15 3.15H6.65A3.15 3.15 0 0 1 3.5 17.35Z" />
  </Ikon>
)

/** Raporlar — doc.text */
export const IkonRapor = (p: IkonProps) => (
  <Ikon {...p}>
    <path d="M13.6 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.9Z" />
    <path d="M13.6 3.5v3.4a2 2 0 0 0 2 2H19" />
    <path d="M8.5 13.25h7" />
    <path d="M8.5 16.6h4.4" />
  </Ikon>
)

/** Çıkış — rectangle.portrait.and.arrow.right */
export const IkonCikis = (p: IkonProps) => (
  <Ikon {...p}>
    <path d="M14.75 8.1V6a2 2 0 0 0-2-2H6.6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.15a2 2 0 0 0 2-2v-2.1" />
    <path d="M10.9 12h9.6" />
    <path d="M17.6 9.1 20.5 12l-2.9 2.9" />
  </Ikon>
)

/** Temsilci uyarısı — exclamationmark.bubble (konuşulacak cari) */
export const IkonUyari = (p: IkonProps) => (
  <Ikon {...p}>
    <path d="M20.5 12.4c0 4.03-3.8 7.3-8.5 7.3-.9 0-1.77-.12-2.58-.34l-5.42 1.14 1.5-4.03A6.86 6.86 0 0 1 3.5 12.4c0-4.03 3.8-7.3 8.5-7.3s8.5 3.27 8.5 7.3Z" />
    <path d="M12 8.9v3.6" />
    <path d="M12 15.35h.01" />
  </Ikon>
)

/** İndirme — arrow.down.circle (PDF butonları) */
export const IkonIndir = (p: IkonProps) => (
  <Ikon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.9v8.2" />
    <path d="M8.9 13 12 16.1l3.1-3.1" />
  </Ikon>
)
