import { useEffect, useRef, useState } from 'react';
import styles from './StepTimer.module.scss';

interface Props {
  seconds: number;
  // key={seconds} на родителе чтобы таймер ресетился при переходе между шагами
}

// Звуковой сигнал через Web Audio API — без внешних файлов
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    // Второй и третий beep для паттерна
    setTimeout(playBeep2, 400);
    setTimeout(playBeep2, 800);

    function playBeep2() {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 880;
      o2.type = 'sine';
      g2.gain.setValueAtTime(0.3, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o2.start();
      o2.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Если AudioContext не сработал (нужен user interaction) — ок, без звука
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function StepTimer({ seconds }: Props) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // сброс при смене секунд (новый шаг)
    setLeft(seconds);
    setRunning(false);
    setFinished(false);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = window.setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          setFinished(true);
          playBeep();
          // Вибрация на мобиле
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 400]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const toggle = () => {
    if (finished) {
      // Перезапуск
      setLeft(seconds);
      setFinished(false);
      setRunning(true);
    } else {
      setRunning((r) => !r);
    }
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setLeft(seconds);
    setRunning(false);
    setFinished(false);
  };

  const progress = 1 - left / seconds;
  const circumference = 2 * Math.PI * 70; // r=70
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={styles.root}>
      <div className={`${styles.circle} ${finished ? styles.finished : ''}`}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" className={styles.track} />
          <circle
            cx="80"
            cy="80"
            r="70"
            className={styles.progress}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset
            }}
          />
        </svg>
        <div className={styles.time}>
          <div className={styles.timeValue}>{formatTime(left)}</div>
          <div className={styles.timeLabel}>
            {finished ? 'Готово!' : running ? 'Идёт' : left === seconds ? 'Готов' : 'Пауза'}
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <button onClick={toggle} className={`${styles.btn} ${styles.btnPrimary}`}>
          {finished ? '↻ Ещё раз' : running ? '⏸ Пауза' : left === seconds ? '▶ Старт' : '▶ Продолжить'}
        </button>
        {(running || left !== seconds) && !finished && (
          <button onClick={reset} className={styles.btn}>
            Сброс
          </button>
        )}
      </div>
    </div>
  );
}
