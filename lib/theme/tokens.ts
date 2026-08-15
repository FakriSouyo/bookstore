/**
 * Design tokens — single source of truth for the visual system.
 * See skills/bookstore-ui/SKILL.md for the token table and usage rules.
 * Never hardcode colors/spacing in components; import from here.
 */

export const tokens = {
  color: {
    primary: '#b45309',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
    background: '#f7f6f4',
    surface: '#ffffff',
    border: '#e6e2dc',
    text: '#1f1e1d',
    textSecondary: '#6b6865',
    textDisabled: '#b5b1ac',
  },
  radius: 6,
  fontSize: 14,
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  /** 8px spacing rhythm (bookstore-ui). */
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    huge: 64,
  },
} as const;

export type DesignTokens = typeof tokens;
