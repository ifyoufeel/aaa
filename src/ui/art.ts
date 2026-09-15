/**
 * Unit silhouettes and faction crests, as raw SVG path markup on a 46x52 grid.
 *
 * GENERATED FILE -- do not edit by hand.
 * Source: design/silhouettes.py and design/sigils.py, via design/gen_art_ts.py.
 * The design canvas draws from the same shapes, so a stack cannot look like one
 * thing on the mockups and another on the battlefield.
 *
 * Silhouettes differ by OUTLINE rather than by detail -- bow-arc, shield-diamond,
 * quadruped, crowned, spiked -- because at token size nothing finer registers.
 *
 * Crests are geometric sigils rather than little pictures of creatures: a wolf
 * at crest size collapses into a blob (an early pass produced one that read as
 * a cat), and Slavic folk carving is geometric anyway.
 */

import type { FactionId } from '../content/types'

/** Silhouette markup by unit id. */
export const UNIT_ART: Record<string, string> = {
  bogatyr: `<path d="M3 44V29c0-7 6-12 13-12h15l7-9 4 3-4 8c3 3 5 7 5 12v13h-5V33h-6v11h-5V33H15v11z"/><circle cx="27" cy="5" r="4.5"/><path d="M22 10h9l3 8H19z"/>`,
  bolotnik: `<path d="M23 9c10 0 17 7 17 16 0 5-2 10-5 13l2 14H9l2-14c-3-3-5-8-5-13 0-9 7-16 17-16z"/><path d="M6 28L0 45l5 2 6-15zM40 28l6 17-5 2-6-15z"/><circle cx="16" cy="22" r="3.2" fill="#0b0f0e"/><circle cx="30" cy="22" r="3.2" fill="#0b0f0e"/>`,
  drekavac: `<path d="M23 0l7 12 11-5-5 12 10 6-11 5 4 13-11-6-5 14-5-14-11 6 4-13-11-5 10-6-5-12 11 5z"/><circle cx="23" cy="24" r="4.5" fill="#0b0f0e"/>`,
  gridin: `<circle cx="23" cy="5" r="5.5"/><path d="M5 9h36v25L23 50 5 34z"/><path d="M23 15v26M13 22h20" stroke="#0b0f0e" stroke-width="2" fill="none"/>`,
  kmet: `<path d="M6.3 0c2 3.4 2.7 5.2 2.7 7.2s-1 3.2-2.7 4.3c-1.7-1.1-2.7-2.3-2.7-4.3S4.3 3.4 6.3 0z"/><rect x="5" y="10" width="2.6" height="42"/><path d="M22 6c4.6 0 7.6 3 7.6 7.6V17H14.4v-3.4C14.4 9 17.4 6 22 6z"/><path d="M13 19h18l2.4 14H10.6z"/><rect x="15" y="35" width="5.4" height="16"/><rect x="23.6" y="35" width="5.4" height="16"/><ellipse cx="35" cy="28" rx="6" ry="9.5"/>`,
  mavka: `<path d="M15 9c0-5 4-9 8-9s8 4 8 9c0 9-2 16-4 21h-8c-2-5-4-12-4-21z"/><path d="M19 15h8c3 12 3 26 1 37h-10c-2-11-2-25 1-37z"/>`,
  rusalka: `<circle cx="23" cy="9" r="6"/><path d="M12 15s5-5 11-5 11 5 11 5c2 12 0 22-4 29-4-4-10-4-14 0-4-7-6-17-4-29z"/><path d="M17 43c4 4 8 4 12 0l7 9H10z"/>`,
  strelets: `<path d="M33 2c11 10 11 34 0 44l-4-3c9-9 9-29 0-38z"/><path d="M31 5L22 24l9 19" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="16" r="6"/><path d="M5 24h14l3 15-5 2-1 11h-4l-1-11-5-2z"/>`,
  vodyanoy: `<path d="M9 9L13 1l5 5 5-6 5 6 5-5 4 8z"/><path d="M23 6c12 0 20 9 20 20 0 9-5 16-12 19l3 7H15l3-7C11 42 6 35 6 26 6 15 14 6 23 6z"/><circle cx="16" cy="24" r="3.6" fill="#0b0f0e"/><circle cx="30" cy="24" r="3.6" fill="#0b0f0e"/><path d="M18 33h10c0 3-2 5-5 5s-5-2-5-5z" fill="#0b0f0e"/>`,
  volkhv: `<circle cx="21" cy="9" r="7"/><path d="M12 19h18l8 33H4z"/><rect x="39" y="6" width="3" height="46"/><circle cx="40.5" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/>`,
}

/** Crest markup by faction id. */
export const FACTION_ART: Record<FactionId, string> = {
  borovina: `<rect x="21" y="30" width="4" height="18"/><path d="M23 2l9 13H14z"/><path d="M23 12l12 15H11z"/><path d="M23 22l15 16H8z"/>`,
  gromoboy: `<circle cx="23" cy="26" r="20" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M23 6v40M5.7 16l34.6 20M5.7 36l34.6-20" stroke="currentColor" stroke-width="2.6" fill="none"/><circle cx="23" cy="26" r="4.5"/>`,
  kitezh: `<circle cx="23" cy="26" r="20" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M23 9l14 17-14 17-14-17z"/><path d="M23 17.5l7 8.5-7 8.5-7-8.5z" fill="#0e1210"/><rect x="20" y="23" width="6" height="6"/>`,
  kostyanoy: `<ellipse cx="23" cy="31" rx="13" ry="17" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="21.7" y="10" width="2.6" height="40"/><circle cx="23" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2.6"/>`,
  topyla: `<path d="M38 22c0-9-7-16-15-16S8 13 8 22c0 7 5 13 12 13 5 0 9-4 9-9 0-4-3-7-7-7-3 0-5 2-5 5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M4 44c5-5 9-5 14 0s9 5 14 0 9-5 10-2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`,
  yagaya: `<path d="M23 4l17 13v15H6V17z"/><rect x="18" y="21" width="10" height="11" fill="#0e1210"/><path d="M15 32l-4 9M31 32l4 9" stroke="currentColor" stroke-width="3" fill="none"/><path d="M6 46l5-5 5 5M30 46l5-5 5 5" stroke="currentColor" stroke-width="2.6" fill="none"/>`,
}

/** Display names, for alt text and tooltips. */
export const UNIT_ART_NAMES: Record<string, string> = {
  bogatyr: 'Bogatyr',
  bolotnik: 'Bolotnik',
  drekavac: 'Drekavac',
  gridin: 'Gridin',
  kmet: 'Kmet',
  mavka: 'Mavka',
  rusalka: 'Rusalka',
  strelets: 'Strelets',
  vodyanoy: 'Vodyanoy',
  volkhv: 'Volkhv',
}
