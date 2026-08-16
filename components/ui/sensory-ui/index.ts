/**
 * sensory-ui sound layer (vendored from the nefo-online repo).
 * WebAudio-synthesized sounds — no asset files, no external deps.
 * Lives at @/components/ui/sensory-ui so the sensory-ui shadcn wrappers
 * (import "@/components/ui/sensory-ui/config/provider") resolve.
 */
export { SensoryUIProvider, useSensoryUI } from './config/provider';
export type { SensoryUIContextValue } from './config/provider';
export type { SensoryUIConfig } from './config/config';
export type { SoundRole } from './config/sound-roles';
