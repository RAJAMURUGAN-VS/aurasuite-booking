import { useEffect, useRef } from 'react';

// Simple interval registry to tick once per second; callers update their own state.
export function useSeatTimers(seats, onExpire) {
  const seatsRef = useRef(seats);
  seatsRef.current = seats;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const expiredIds = [];
      for (const s of seatsRef.current) {
        if (s.state === 'booked' && s.expiresAt) {
          const diff = new Date(s.expiresAt).getTime() - now;
          if (diff <= 0) expiredIds.push(s.id);
        }
      }
      if (expiredIds.length) onExpire(expiredIds);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [onExpire]);
}


