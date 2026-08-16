/**
 * Design tokens — single source of truth for the visual system.
 * See skills/bookstore-ui/SKILL.md for the token table and usage rules.
 * Never hardcode colors/spacing in components; import from here.
 *
 * Direction (2026): NEFO/sensory-ui visual language (ref: nefo-online).
 * Blue-first (#1784cb), very light blue-tinted page (#f6faff), thin ring
 * borders (#cfe4f5), deep navy text (#0d1b2a), SQUARE surfaces (rounded-none),
 * compact 32px controls, mono uppercase micro-labels, and a visible 1px
 * pressed state on interactive elements.
 */

export const tokens = {
  color: {
    /** NEFO blue — the primary accent. */
    primary: '#1784cb',
    primaryHover: '#41a3dc',
    primaryActive: '#0f6ca5',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#1784cb',
    link: '#1784cb',
    /** Very light blue page background (nefo). */
    background: '#f6faff',
    surface: '#ffffff',
    /** Thin ring borders (nefo #cfe4f5). */
    border: '#cfe4f5',
    borderSoft: '#e5f1fa',
    /** Deep navy text (nefo #0d1b2a). */
    text: '#0d1b2a',
    textSecondary: '#5b6b82',
    textDisabled: '#94a3b8',
    menuHoverBg: '#f1f8fe',
    menuSelectedBg: '#eaf6fe',
    siderBg: '#f1f7fd',
  },
  /** Square surfaces (nefo rounded-none). */
  radius: 0,
  /** Compact base font (nefo text-xs/13px). */
  fontSize: 13,
  fontFamily: "var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
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
