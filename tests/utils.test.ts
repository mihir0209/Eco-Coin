import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions Suite', () => {
  it('combines multiple class names', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('handles conditional classes properly', () => {
    const isVisible = false;
    const isActive = true;
    expect(cn('base', isVisible && 'hidden', isActive && 'active')).toBe('base active');
  });

  it('merges tailwind conflicts using tailwind-merge', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
