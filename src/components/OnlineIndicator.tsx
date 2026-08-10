import { useState, useEffect, useCallback, useRef } from 'react';

const VISITOR_KEY = 'ganpatifm_visitor';
const ACTIVE_KEY = 'ganpatifm_active';
const TTL = 5 * 60 * 1000;

function getCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const map: Record<string, { name: string; flag: string }> = {
      'Asia/Kolkata': { name: 'India', flag: '🇮🇳' },
      'Asia/Calcutta': { name: 'India', flag: '🇮🇳' },
      'America/New_York': { name: 'USA', flag: '🇺🇸' },
      'America/Chicago': { name: 'USA', flag: '🇺🇸' },
      'America/Los_Angeles': { name: 'USA', flag: '🇺🇸' },
      'America/Denver': { name: 'USA', flag: '🇺🇸' },
      'America/Toronto': { name: 'Canada', flag: '🇨🇦' },
      'America/Vancouver': { name: 'Canada', flag: '🇨🇦' },
      'Europe/London': { name: 'UK', flag: '🇬🇧' },
      'Europe/Berlin': { name: 'Germany', flag: '🇩🇪' },
      'Europe/Paris': { name: 'France', flag: '🇫🇷' },
      'Asia/Dubai': { name: 'UAE', flag: '🇦🇪' },
      'Asia/Singapore': { name: 'Singapore', flag: '🇸🇬' },
      'Asia/Kathmandu': { name: 'Nepal', flag: '🇳🇵' },
      'Asia/Tokyo': { name: 'Japan', flag: '🇯🇵' },
      'Asia/Shanghai': { name: 'China', flag: '🇨🇳' },
      'Asia/Seoul': { name: 'Korea', flag: '🇰🇷' },
      'Australia/Sydney': { name: 'Australia', flag: '🇦🇺' },
      'Australia/Melbourne': { name: 'Australia', flag: '🇦🇺' },
    };
    if (map[tz]) return map[tz];
    const continent = tz.split('/')[0];
    if (continent === 'America') return { name: 'Americas', flag: '🌎' };
    if (continent === 'Europe') return { name: 'Europe', flag: '🌍' };
    if (continent === 'Asia') return { name: 'Asia', flag: '🌏' };
    return { name: 'Other', flag: '🌐' };
  } catch {
    return { name: 'Other', flag: '🌐' };
  }
}

function prune(data: Record<string, number>) {
  const now = Date.now();
  for (const [id, ts] of Object.entries(data)) {
    if (now - ts > TTL) delete data[id];
  }
  return data;
}

function getActive(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setActive(data: Record<string, number>) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(data));
}

interface CountryEntry {
  name: string;
  flag: string;
  count: number;
}

export default function OnlineIndicator() {
  const [count, setCount] = useState(0);
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const myIdRef = useRef('');
  const bcRef = useRef<BroadcastChannel | null>(null);

  const heartbeat = useCallback(() => {
    const myId = myIdRef.current;
    let data = getActive();
    data = prune(data);
    data[myId] = Date.now();
    setActive(data);

    const pruned = prune({ ...data });
    const c = Object.keys(pruned).length;
    setCount(c);

    const countryMap: Record<string, CountryEntry> = {};
    for (const id of Object.keys(pruned)) {
      const country = getCountry();
      if (!countryMap[country.name]) {
        countryMap[country.name] = { ...country, count: 0 };
      }
      countryMap[country.name].count++;
    }
    setCountries(Object.values(countryMap).sort((a, b) => b.count - a.count));
  }, []);

  useEffect(() => {
    let id = sessionStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(VISITOR_KEY, id);
    }
    myIdRef.current = id;

    heartbeat();
    const interval = setInterval(heartbeat, 5000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_KEY) heartbeat();
    };
    window.addEventListener('storage', onStorage);

    try {
      const bc = new BroadcastChannel('ganpatifm_online');
      bcRef.current = bc;
      bc.onmessage = () => heartbeat();
      const bcInterval = setInterval(() => bc.postMessage('ping'), 5000);
      return () => {
        clearInterval(interval);
        clearInterval(bcInterval);
        window.removeEventListener('storage', onStorage);
        bc.close();
      };
    } catch {
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', onStorage);
      };
    }
  }, [heartbeat]);

  useEffect(() => {
    const onUnload = () => {
      const data = getActive();
      delete data[myIdRef.current];
      setActive(data);
      try {
        const bc = new BroadcastChannel('ganpatifm_online');
        bc.postMessage('bye');
        bc.close();
      } catch {}
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  if (count <= 1) return null;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="flex items-center gap-2 text-[15px] opacity-90 drop-shadow-[0_1px_6px_rgba(0,0,0,.5)] cursor-default bg-transparent border-none text-[var(--color-cream)]"
      >
        <span className="relative flex h-[9px] w-[9px]">
          <span
            className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-green)] opacity-75"
            style={{ animation: 'pulse-green 2s ease-in-out infinite' }}
          />
          <span className="relative inline-flex h-[9px] w-[9px] rounded-full bg-[var(--color-green)]" style={{ boxShadow: '0 0 8px #3ddc84' }} />
        </span>
        <span className="tabular-nums">{count}</span>
        <span className="opacity-70">online</span>
      </button>

      <div
        className={`absolute top-full left-0 mt-2 bg-[rgba(20,10,5,.92)] backdrop-blur-xl border border-white/10 rounded-xl p-3.5 min-w-[200px] shadow-[0_12px_40px_rgba(0,0,0,.6)] transition-all duration-200 z-30 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">Viewers by country</div>
        {countries.map((c) => (
          <div key={c.name} className="flex items-center gap-2 py-0.5 text-[13px]">
            <span className="text-[15px]">{c.flag}</span>
            <span className="flex-1 text-white/85">{c.name}</span>
            <span className="tabular-nums text-white/45">{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
