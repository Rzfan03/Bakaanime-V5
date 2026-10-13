import { useEffect, useRef, useState } from 'react'
import { SplashScreen as NativeSplash } from '@capacitor/splash-screen'

const FADE_MS = 500 // lama fade-out menuju app
const FALLBACK_MS = 6000 // jaga-jaga kalau video gagal diputar

type Props = { onDone: () => void }

export default function SplashScreen({ onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const [reduceMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  function hideNative() {
    NativeSplash.hide({ fadeOutDuration: 150 }).catch(() => {})
  }

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    hideNative()
    setLeaving(true)
    setTimeout(() => onDoneRef.current(), FADE_MS)
  }

  useEffect(() => {
    // splash native hanya menutupi jeda awal; setelah ini poster/video tampil
    const hideTimer = setTimeout(hideNative, 1000)

    // pengaman: tetap lanjut ke app walau video bermasalah
    const fallbackTimer = setTimeout(finish, reduceMotion ? 1500 : FALLBACK_MS)

    const v = videoRef.current
    if (v) {
      v.muted = true
      v.play().catch(finish)
    }

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(fallbackTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onClick={finish} // ketuk di mana saja untuk melewati
      className={`fixed inset-0 z-[100] overflow-hidden bg-m3-surface transition-opacity ease-out ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {reduceMotion ? (
        <img
          src="/splash-poster.jpg"
          alt=""
          onLoad={hideNative}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <video
          ref={videoRef}
          src="/splash.mp4"
          poster="/splash-poster.jpg"
          autoPlay
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          onLoadedData={hideNative}
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            if (v.duration) setProgress(v.currentTime / v.duration)
          }}
          onEnded={finish}
          onError={finish}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* gradasi bawah supaya teks terbaca */}
      <div className="absolute inset-0 bg-gradient-to-t from-m3-surface via-m3-surface/30 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-10 pb-[calc(env(safe-area-inset-bottom)+48px)]">
        <div className="splash-rise flex items-center gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-m3-on-surface">
            BakaAnime
          </h1>
          <span className="rounded-lg bg-m3-primary-container px-2 py-0.5 text-xs font-bold text-m3-on-primary-container">
            v5
          </span>
        </div>

        {/* progress linear gaya Material 3 */}
        <div
          role="progressbar"
          aria-label="Memuat"
          className="mt-6 h-1 w-full max-w-56 overflow-hidden rounded-full bg-m3-surface-variant"
        >
          <div
            className="h-full rounded-full bg-m3-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
