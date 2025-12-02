"use client";

import { useState, useEffect, useCallback } from 'react';

interface CountdownTimerProps {
  dueDate: string;
}

interface TimeLeft {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

const CountdownTimer = ({ dueDate }: CountdownTimerProps) => {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const difference = +new Date(dueDate) - +new Date();
    let timeLeft: TimeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  }, [dueDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    // Sayacı her saniye güncellemek için interval ayarla
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Component kaldırıldığında interval'ı temizle
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (Object.keys(timeLeft).length === 0) {
    return <div className="font-mono text-lg text-red-500">Süre Doldu!</div>;
  }

  let timeString = '';
  if (timeLeft.days && timeLeft.days > 0) {
    timeString += `${timeLeft.days}g `;
  }
  
  timeString += `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;

  return (
    <div className="font-mono text-lg text-yellow-600 dark:text-yellow-400">
      {timeString}
    </div>
  );
};

export default CountdownTimer;