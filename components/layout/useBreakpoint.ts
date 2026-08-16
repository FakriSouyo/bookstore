'use client';

import { useCallback, useSyncExternalStore } from 'react';

const QUERIES = {
  sm: '(min-width: 576px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 992px)',
  xl: '(min-width: 1200px)',
} as const;

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // getServerSnapshot: false — must match the SSR output so hydration never
  // fails. After mount, useSyncExternalStore re-reads the real viewport and
  // re-renders (e.g. desktop shell -> mobile bottom-nav) without crashing.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useBreakpoint() {
  const sm = useMediaQuery(QUERIES.sm);
  const md = useMediaQuery(QUERIES.md);
  const lg = useMediaQuery(QUERIES.lg);
  const xl = useMediaQuery(QUERIES.xl);

  return {
    isMobile: !md, // < 768px
    isTablet: md && !lg, // 768–991px
    isDesktop: lg, // >= 992px
    screens: { sm, md, lg, xl },
  };
}
