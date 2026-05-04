import type { BlockColor } from '../types/types';

// Centralized color class mappings (so they survive Tailwind purge with safelist).
export const BLOCK_BG: Record<BlockColor, string> = {
  amber: 'bg-amber-100',
  rose: 'bg-rose-100',
  emerald: 'bg-emerald-100',
  sky: 'bg-sky-100',
  violet: 'bg-violet-100',
  teal: 'bg-teal-100',
  indigo: 'bg-indigo-100',
  stone: 'bg-stone-200',
};

export const BLOCK_TEXT: Record<BlockColor, string> = {
  amber: 'text-amber-800',
  rose: 'text-rose-800',
  emerald: 'text-emerald-800',
  sky: 'text-sky-800',
  violet: 'text-violet-800',
  teal: 'text-teal-800',
  indigo: 'text-indigo-800',
  stone: 'text-stone-700',
};

export const BLOCK_BORDER: Record<BlockColor, string> = {
  amber: 'border-amber-300',
  rose: 'border-rose-300',
  emerald: 'border-emerald-300',
  sky: 'border-sky-300',
  violet: 'border-violet-300',
  teal: 'border-teal-300',
  indigo: 'border-indigo-300',
  stone: 'border-stone-300',
};

export const BLOCK_BAR: Record<BlockColor, string> = {
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
  stone: 'bg-stone-500',
};
