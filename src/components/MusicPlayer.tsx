import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, ExternalLink } from 'lucide-react';

const SONGS = [
  { id: "5o1YLpAmmjw", title: "Sukhkarta Dukhharta", artist: "Lata Mangeshkar" },
  { id: "RCCYorPLJmQ", title: "Deva Shree Ganesha", artist: "Ajay-Atul" },
  { id: "mkIJ9ELLsDY", title: "Morya Re", artist: "Shankar Mahadevan" },
  { id: "KJF8t-BWVRM", title: "Gajanana", artist: "Sukhwinder Singh" },
  { id: "d9b4l2kcxqM", title: "Jai Dev Jai Dev", artist: "Lata Mangeshkar" },
  { id: "uTP-RJVGYC0", title: "Sadda Dil Vi Tu (Ga Ga Ga Ganpati)", artist: "Hard Kaur" },
  { id: "Cowigw7ifCs", title: "Morya Aala Re", artist: "Ganpati Bappa Morya 2024" },
  { id: "IZqxab7hx1Q", title: "Ganesh Aarti", artist: "Lata Mangeshkar" },
  { id: "2Mv99rlbcIQ", title: "Gajanana (Full Video)", artist: "Sukhwinder Singh" },
  { id: "TvuH_cFaJII", title: "Mourya Re Lyrical", artist: "Shankar Mahadevan" },
];

function fmt(t: number) {
  t = Math.floor(t || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function MusicPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [song, setSong] = useState({ title: 'Press play, devotee', artist: '—' });
  const [coverUrl, setCoverUrl] = useState('');
  const [currentTime, setCurrentTime] = useState('0:00');
  const [duration, setDuration] = useState('0:00');
  const [progress, setProgress] = useState(0);

  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const startedRef = useRef(false);
  const timerRef = useRef<any>(null);
  const seekLockRef = useRef(0);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);

  const updateDisplay = useCallback((idx: number) => {
    const s = SONGS[idx];
    setSong({ title: s.title, artist: s.artist });
    setCoverUrl(`https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`);
  }, []);

  const goTo = useCallback((index: number) => {
    const next = ((index % SONGS.length) + SONGS.length) % SONGS.length;
    currentIndexRef.current = next;
    setCurrentIndex(next);
    updateDisplay(next);
    if (readyRef.current && playerRef.current) {
      playerRef.current.loadVideoById(SONGS[next].id);
    }
  }, [updateDisplay]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (Date.now() < seekLockRef.current) return;
      const p = playerRef.current;
      if (!p) return;
      const c = p.getCurrentTime?.() ?? 0;
      const d = p.getDuration?.() ?? 0;
      setCurrentTime(fmt(c));
      setDuration(fmt(d));
      setProgress(d ? (c / d) * 100 : 0);
    }, 250);
  }, []);

  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      const player = new window.YT.Player(ytContainerRef.current, {
        videoId: SONGS[0].id,
        playerVars: { controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
            updateDisplay(0);
          },
          onError: () => {
            setSong({ title: 'Skipping blocked song...', artist: '' });
            setTimeout(() => {
              const next = currentIndexRef.current + 1;
              currentIndexRef.current = next;
              setCurrentIndex(next);
              updateDisplay(next);
              if (playerRef.current) {
                playerRef.current.loadVideoById(SONGS[next % SONGS.length].id);
              }
            }, 1000);
          },
          onStateChange: (e: any) => {
            const playing = e.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (playing) {
              startedRef.current = true;
              startTimer();
            } else {
              clearInterval(timerRef.current);
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              const next = currentIndexRef.current + 1;
              currentIndexRef.current = next;
              setCurrentIndex(next);
              updateDisplay(next);
              if (playerRef.current) {
                playerRef.current.loadVideoById(SONGS[next % SONGS.length].id);
              }
            }
          },
        },
      });
      playerRef.current = player;
    };

    return () => clearInterval(timerRef.current);
  }, []);

  const handlePlay = () => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    const st = p.getPlayerState?.();
    if (st === window.YT?.PlayerState?.PLAYING) {
      p.pauseVideo();
    } else if (!startedRef.current) {
      p.loadVideoById(SONGS[currentIndexRef.current].id);
    } else {
      p.playVideo();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = playerRef.current;
    if (!p || !readyRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const dur = p.getDuration?.() ?? 0;
    const seekTime = fraction * dur;
    setProgress(fraction * 100);
    setCurrentTime(fmt(seekTime));
    seekLockRef.current = Date.now() + 2000;
    p.seekTo(seekTime, true);
  };

  return (
    <>
    <div className={`absolute left-1/2 bottom-[6%] -translate-x-1/2 w-[min(560px,92vw)] z-[6] rounded-2xl border-[6px] border-[var(--color-saffron)] shadow-[0_18px_40px_rgba(0,0,0,.6),inset_0_0_0_3px_rgba(255,248,238,.15)] p-5 ${isPlaying ? 'playing' : ''}`}
        style={{ background: 'linear-gradient(135deg, #c0392b, #8B0000)' }}>

      <div className="flex items-center gap-3.5">
        <div className="relative w-16 h-16 shrink-0">
          <div
            className="w-full h-full rounded-full border-[3px] border-[var(--color-gold)] bg-[var(--color-dark)] bg-cover bg-center"
            style={{
              backgroundImage: coverUrl ? `url(${coverUrl})` : undefined,
              animation: isPlaying ? 'spin 8s linear infinite' : 'none',
            }}
          />
          <div className="absolute left-1/2 top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/80 border-2 border-[rgba(255,215,0,.5)] pointer-events-none" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-base truncate">{song.title}</div>
          <div className="text-[13px] opacity-85 mt-0.5">{song.artist}</div>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={() => goTo(currentIndex - 1)} aria-label="Previous song"
            className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full cursor-pointer border-none text-[#1a1a1a] shadow-[0_3px_0_rgba(0,0,0,.4)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(0,0,0,.4)] focus-visible:outline-3 focus-visible:outline-[var(--color-gold)] focus-visible:outline-offset-2"
            style={{ background: 'var(--color-cream)' }}>
            <SkipBack className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <button onClick={handlePlay} aria-label="Play or pause"
            className="inline-flex items-center justify-center w-[54px] h-[54px] rounded-full cursor-pointer border-none text-[#1a1a1a] shadow-[0_3px_0_rgba(0,0,0,.4)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(0,0,0,.4)] focus-visible:outline-3 focus-visible:outline-[var(--color-gold)] focus-visible:outline-offset-2"
            style={{ background: 'var(--color-saffron)' }}>
            {isPlaying ? (
              <Pause className="w-5 h-5" strokeWidth={2.5} />
            ) : (
              <Play className="w-5 h-5" strokeWidth={2.5} />
            )}
          </button>
          <button onClick={() => goTo(currentIndex + 1)} aria-label="Next song"
            className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full cursor-pointer border-none text-[#1a1a1a] shadow-[0_3px_0_rgba(0,0,0,.4)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(0,0,0,.4)] focus-visible:outline-3 focus-visible:outline-[var(--color-gold)] focus-visible:outline-offset-2"
            style={{ background: 'var(--color-cream)' }}>
            <SkipForward className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5 text-[13px]">
        <span className="tabular-nums">{currentTime}</span>
        <div className="flex-1 h-2 rounded-md bg-black/40 cursor-pointer relative" onClick={handleSeek}>
          <div className="absolute left-0 top-0 bottom-0 rounded-md" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--color-saffron), var(--color-gold))',
            transition: 'width .1s linear',
          }} />
        </div>
        <span className="tabular-nums">{duration}</span>
      </div>
    </div>

    <div ref={ytContainerRef} style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 }} />
    </>
  );
}
