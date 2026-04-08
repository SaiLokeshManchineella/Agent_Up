'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface SiriOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0 to 1
}

export function SiriOrb({ isListening, isSpeaking, audioLevel }: SiriOrbProps) {
  // Generate distinct blob layers and their animations
  const blobs = useMemo(() => [
    { color: 'bg-primary', delay: 0, scale: 1, duration: 3.2 },
    { color: 'bg-secondary', delay: 0.5, scale: 0.9, duration: 4.1 },
    { color: 'bg-indigo-400', delay: 1.2, scale: 1.1, duration: 3.5 },
    { color: 'bg-emerald-400', delay: 2.0, scale: 0.8, duration: 5.0 },
  ], []);

  // Intensity multiplier based on activity
  const intensity = isSpeaking ? 1.5 : isListening ? 1.2 : 0.4;
  const reactiveScale = 1 + (audioLevel * 0.5 * intensity);

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Custom SVG Filter for "Gooey" effect */}
      <svg className="absolute w-0 h-0" style={{ pointerEvents: 'none' }}>
        <defs>
          <filter id="liquid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -15" 
              result="liquid-goo" 
            />
            <feComposite in="SourceGraphic" in2="liquid-goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div 
        className="w-full h-full relative"
        style={{ filter: 'url(#liquid-goo)' }}
      >
        <AnimatePresence>
          {blobs.map((blob, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ 
                scale: blob.scale * reactiveScale * (isListening || isSpeaking ? 1.2 : 1),
                x: [0, 20 * intensity, -15 * intensity, 10 * intensity, 0],
                y: [0, -15 * intensity, 25 * intensity, -10 * intensity, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                scale: { 
                    type: "spring", 
                    stiffness: 150, 
                    damping: 15,
                },
                x: { 
                    repeat: Infinity, 
                    duration: blob.duration / intensity, 
                    ease: "easeInOut",
                    delay: blob.delay
                },
                y: { 
                    repeat: Infinity, 
                    duration: (blob.duration * 0.8) / intensity, 
                    ease: "easeInOut",
                    delay: blob.delay
                },
                rotate: {
                    repeat: Infinity,
                    duration: 10 / intensity,
                    ease: "linear"
                }
              }}
              className={`absolute inset-0 rounded-[45%] opacity-60 mix-blend-screen blur-xl ${blob.color}`}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Inner Glow Core */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="absolute w-24 h-24 bg-white/20 blur-2xl rounded-full z-10 pointer-events-none"
      />

      {/* Secondary Pulse Ring */}
      {(isSpeaking || isListening) && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
          className={`absolute inset-0 border-2 rounded-full pointer-events-none ${
              isSpeaking ? 'border-primary/40' : 'border-secondary/40'
          }`}
        />
      )}
    </div>
  );
}
