import { useState, useEffect } from 'react';

export default function Clock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      setTime(`${h}:${m} ${ampm}`);
    }
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, []);

  const [h, rest] = time.split(':');
  const [m, ap] = rest?.split(' ') ?? ['', ''];

  return (
    <div className="text-[15px] font-medium tabular-nums opacity-90 drop-shadow-[0_1px_6px_rgba(0,0,0,.5)]">
      {h}<span className="animate-blink inline-block" style={{ animation: 'blink 1s steps(1) infinite' }}>:</span>{m} {ap}
    </div>
  );
}
