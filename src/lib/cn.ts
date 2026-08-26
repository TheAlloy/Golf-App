import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names, last-wins on conflicts. Same helper shadcn uses. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
