/**
 * Theme-27 Kiosk — Virtual Keyboard
 *
 * On-screen keyboard for kiosk touchscreens (no physical keyboard).
 * Two layouts:
 *   - Turkish QWERTY  → when active language is "tr"
 *   - English QWERTY  → every other language
 *
 * Features:
 *   - Auto-capitalize at sentence start and after . ! ?
 *   - Number row always visible (never swapped to symbols)
 *   - Backspace sits beside the text input for easy reach
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
  title?: string;
}

/* ── Number row (always visible) ─────────────────── */
const NUMBERS: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

/* ── Turkish letter rows ─────────────────────────── */
const TR_LOWER: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'ı', 'o', 'p', 'ğ', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ş', 'i'],
  ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'ö', 'ç'],
];
const TR_UPPER: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
  ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç'],
];

/* ── English letter rows ─────────────────────────── */
const EN_LOWER: string[][] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['⇧', 'z', 'x', 'c', 'v', 'b', 'n', 'm'],
];
const EN_UPPER: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

/* ── Symbol rows (AltGr mode) ──────────────────── */
const SYMBOLS: string[][] = [
  ['!', '@', '#', '$', '%', '^', '*', '(', ')'],
  ['+', '/', '\\', ':', "'", '"', '_'],
  ['~', '<', '>', '?', '€'],
];

export function VirtualKeyboard({ value, onChange, onClose, placeholder, title }: VirtualKeyboardProps) {
  const { i18n } = useTranslation();
  // Auto-capitalize: start shifted when value is empty or after sentence-end (.!?)
  const shouldAutoShift = (v: string) => v.length === 0 || /[.!?]\s*$/.test(v);
  const [shifted, setShifted] = useState(() => shouldAutoShift(value));
  const [symbolMode, setSymbolMode] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);
  const backspaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTurkish = i18n.language === 'tr';
  const letterRows = shifted
    ? (isTurkish ? TR_UPPER : EN_UPPER)
    : (isTurkish ? TR_LOWER : EN_LOWER);
  const activeRows = symbolMode ? SYMBOLS : letterRows;

  // Auto-scroll text display to the end when value changes
  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight;
    }
  }, [value]);

  // Re-enable shift automatically after sentence-ending punctuation
  useEffect(() => {
    if (shouldAutoShift(value)) setShifted(true);
  }, [value]);

  // Cleanup backspace timer on unmount
  useEffect(() => {
    return () => {
      if (backspaceTimerRef.current) clearTimeout(backspaceTimerRef.current);
    };
  }, []);

  const handleKey = (key: string) => {
    if (key === '⇧') {
      setShifted((prev) => !prev);
      return;
    }
    onChange(value + key);
    if (shifted && !symbolMode) setShifted(false);
  };

  /* Backspace: tap = delete one char, hold 2 s = clear all */
  const handleBackspaceStart = () => {
    onChange(value.slice(0, -1));
    backspaceTimerRef.current = setTimeout(() => {
      onChange('');
    }, 2000);
  };

  const handleBackspaceEnd = () => {
    if (backspaceTimerRef.current) {
      clearTimeout(backspaceTimerRef.current);
      backspaceTimerRef.current = null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/30 flex flex-col justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-card rounded-t-3xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title + text display + backspace */}
        <div className="px-4 pt-4 pb-2">
          {title && <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>}
          <div className="flex items-stretch gap-2">
            <div
              ref={displayRef}
              className="flex-1 min-h-[56px] max-h-[90px] p-3 bg-secondary rounded-xl text-foreground text-base overflow-y-auto break-words leading-relaxed"
            >
              {value || <span className="text-muted-foreground">{placeholder}</span>}
              <span className="inline-block w-0.5 h-5 bg-primary animate-pulse ml-0.5 align-text-bottom" />
            </div>
            <button
              onMouseDown={handleBackspaceStart}
              onMouseUp={handleBackspaceEnd}
              onMouseLeave={handleBackspaceEnd}
              onTouchStart={handleBackspaceStart}
              onTouchEnd={handleBackspaceEnd}
              className="w-28 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 active:scale-95 transition-all select-none flex items-center justify-center shrink-0 text-xl"
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Keyboard rows */}
        <div className="px-1.5 pb-1.5 space-y-1">
          {/* Number row — always visible */}
          <div className="flex justify-center gap-[3px]">
            {NUMBERS.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex-1 h-11 rounded-lg font-medium text-base bg-secondary text-foreground active:scale-95 active:brightness-90 select-none flex items-center justify-center"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Letter / Symbol rows */}
          {activeRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-[3px]">
              {row.map((key, keyIdx) => {
                const isShift = key === '⇧';

                let cls =
                  'h-12 rounded-lg font-medium text-base transition-all active:scale-95 active:brightness-90 select-none flex items-center justify-center ';

                if (isShift) {
                  cls += shifted
                    ? 'min-w-[88px] px-3 bg-primary text-primary-foreground'
                    : 'min-w-[88px] px-3 bg-muted text-foreground';
                } else {
                  cls += 'flex-1 bg-secondary text-foreground';
                }

                return (
                  <button
                    key={`${rowIdx}-${keyIdx}`}
                    onClick={() => handleKey(key)}
                    className={cls}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Bottom row: AltGr | Space | , | . | Done */}
          <div className="flex gap-[3px] mt-0.5">
            <button
              onClick={() => { setSymbolMode(!symbolMode); if (symbolMode) setShifted(shouldAutoShift(value)); }}
              className={`px-4 h-12 rounded-lg font-bold text-xs active:scale-95 select-none flex items-center justify-center ${
                symbolMode
                  ? 'bg-[#0ea5e9] text-white'
                  : 'bg-[#bae6fd] text-[#0c4a6e]'
              }`}
            >
              {symbolMode ? 'ABC' : 'Alt Gr'}
            </button>
            <button
              onClick={() => handleKey(' ')}
              className="flex-1 h-12 rounded-lg bg-secondary text-muted-foreground font-medium text-sm active:scale-95 select-none flex items-center justify-center"
            >
              {isTurkish ? 'Boşluk' : 'Space'}
            </button>
            <button
              onClick={() => handleKey(',')}
              className="w-12 h-12 rounded-lg bg-secondary text-foreground font-medium text-lg active:scale-95 select-none flex items-center justify-center"
            >
              ,
            </button>
            <button
              onClick={() => handleKey('.')}
              className="w-12 h-12 rounded-lg bg-secondary text-foreground font-medium text-lg active:scale-95 select-none flex items-center justify-center"
            >
              .
            </button>
            <button
              onClick={onClose}
              className="px-5 h-12 rounded-lg bg-[#16a34a] text-white font-bold text-sm active:scale-95 select-none flex items-center justify-center"
            >
              {isTurkish ? 'Tamam' : 'Done'}
            </button>
          </div>
        </div>

        {/* Bottom safe area */}
        <div className="h-2" />
      </motion.div>
    </motion.div>
  );
}
