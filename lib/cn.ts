import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and lets a later Tailwind class win over an earlier one in
 * the same group, so a component's defaults can be overridden by the caller
 * without the two both ending up in the markup and fighting.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
