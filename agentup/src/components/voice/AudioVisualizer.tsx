'use client';

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
}

export function AudioVisualizer({ audioLevel, isActive }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef<number[]>(new Array(32).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const bars = barsRef.current;
      const barWidth = width / bars.length;
      const gap = 2;

      // Update bars with audio level (smoothed)
      for (let i = 0; i < bars.length; i++) {
        const target = isActive
          ? audioLevel * (0.5 + Math.random() * 0.5) * height
          : 2;
        bars[i] += (target - bars[i]) * 0.15;
      }

      // Draw bars
      for (let i = 0; i < bars.length; i++) {
        const barHeight = Math.max(2, bars[i]);
        const x = i * barWidth + gap;
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, isActive ? '#3b82f6' : '#d1d5db');
        gradient.addColorStop(1, isActive ? '#1d4ed8' : '#9ca3af');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap * 2, barHeight, 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [audioLevel, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={60}
      className="w-full max-w-xs"
    />
  );
}
