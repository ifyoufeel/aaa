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
  alkonost: `<circle cx="23" cy="9" r="6"/><path d="M18 16h10c3 10 3 22 1 33h-12c-2-11-2-23 1-33z"/><path d="M18 20L2 14l3 10-4 2 15 8zM28 20l16-6-3 10 4 2-15 8z"/>`,
  bessmertnyy: `<path d="M11 8L15 0l4 5 4-5 4 5 4-5 4 8z"/><path d="M23 8c8 0 13 5 13 13 0 5-2 9-6 11l2 6H14l2-6c-4-2-6-6-6-11 0-8 5-13 13-13z"/><circle cx="18" cy="20" r="3" fill="#0b0f0e"/><circle cx="28" cy="20" r="3" fill="#0b0f0e"/><path d="M17 38h12l3 14H14z"/>`,
  bogatyr: `<path d="M3 44V29c0-7 6-12 13-12h15l7-9 4 3-4 8c3 3 5 7 5 12v13h-5V33h-6v11h-5V33H15v11z"/><circle cx="27" cy="5" r="4.5"/><path d="M22 10h9l3 8H19z"/>`,
  bolotnik: `<path d="M23 9c10 0 17 7 17 16 0 5-2 10-5 13l2 14H9l2-14c-3-3-5-8-5-13 0-9 7-16 17-16z"/><path d="M6 28L0 45l5 2 6-15zM40 28l6 17-5 2-6-15z"/><circle cx="16" cy="22" r="3.2" fill="#0b0f0e"/><circle cx="30" cy="22" r="3.2" fill="#0b0f0e"/>`,
  borovik: `<path d="M23 4c11 0 19 7 19 15 0 3-2 5-5 5H9c-3 0-5-2-5-5C4 11 12 4 23 4z"/><path d="M18 24h10c2 10 2 19 1 28h-12c-1-9-1-18 1-28z"/><circle cx="14" cy="13" r="2.6" fill="#0b0f0e"/><circle cx="31" cy="11" r="3.2" fill="#0b0f0e"/>`,
  drekavac: `<path d="M23 0l7 12 11-5-5 12 10 6-11 5 4 13-11-6-5 14-5-14-11 6 4-13-11-5 10-6-5-12 11 5z"/><circle cx="23" cy="24" r="4.5" fill="#0b0f0e"/>`,
  dubovik: `<path d="M12 6h22v6H12z"/><path d="M16 12h14l3 26H13z"/><path d="M13 38h20l6 14H7z"/><path d="M16 20L4 16l1 5 11 3zM30 20l12-4-1 5-11 3z"/><circle cx="19" cy="22" r="2.2" fill="#0b0f0e"/><circle cx="27" cy="22" r="2.2" fill="#0b0f0e"/>`,
  gridin: `<circle cx="23" cy="5" r="5.5"/><path d="M5 9h36v25L23 50 5 34z"/><path d="M23 15v26M13 22h20" stroke="#0b0f0e" stroke-width="2" fill="none"/>`,
  gromovik: `<circle cx="20" cy="9" r="6"/><path d="M11 17h18l3 15H8z"/><rect x="14" y="32" width="18" height="18"/><path d="M30 6h14v8H30z"/><rect x="30" y="12" width="3" height="16"/>`,
  izba: `<path d="M23 2l18 14v16H5V16z"/><rect x="17" y="20" width="12" height="12" fill="#0b0f0e"/><path d="M14 32l-4 11M32 32l4 11" stroke="currentColor" stroke-width="3.5" fill="none"/><path d="M4 48l6-6 6 6M30 48l6-6 6 6" stroke="currentColor" stroke-width="3" fill="none"/>`,
  kikimora: `<path d="M23 14c7 0 12 5 12 12 0 6-3 11-7 14l1 12H17l1-12c-4-3-7-8-7-14 0-7 5-12 12-12z"/><path d="M14 15L8 4l9 4zM32 15l6-11-9 4z"/><circle cx="18" cy="25" r="2.8" fill="#0b0f0e"/><circle cx="28" cy="25" r="2.8" fill="#0b0f0e"/>`,
  kmet: `<path d="M6.3 0c2 3.4 2.7 5.2 2.7 7.2s-1 3.2-2.7 4.3c-1.7-1.1-2.7-2.3-2.7-4.3S4.3 3.4 6.3 0z"/><rect x="5" y="10" width="2.6" height="42"/><path d="M22 6c4.6 0 7.6 3 7.6 7.6V17H14.4v-3.4C14.4 9 17.4 6 22 6z"/><path d="M13 19h18l2.4 14H10.6z"/><rect x="15" y="35" width="5.4" height="16"/><rect x="23.6" y="35" width="5.4" height="16"/><ellipse cx="35" cy="28" rx="6" ry="9.5"/>`,
  kost: `<path d="M23 2c6 0 10 4 10 10 0 3-1 5-3 7l1 5H15l1-5c-2-2-3-4-3-7 0-6 4-10 10-10z"/><circle cx="19" cy="11" r="2.8" fill="#0b0f0e"/><circle cx="27" cy="11" r="2.8" fill="#0b0f0e"/><rect x="21" y="26" width="4" height="24"/><path d="M12 29h22M11 35h24M13 41h20" stroke="currentColor" stroke-width="3" fill="none"/>`,
  kostolom: `<circle cx="23" cy="8" r="5"/><path d="M4 18h38l-4 14H8z"/><path d="M12 32h22l-2 20H14z"/><rect x="0" y="20" width="6" height="22"/><rect x="40" y="20" width="6" height="22"/>`,
  leshy: `<path d="M10 14L2 2l1 8 5 8zM36 14L44 2l-1 8-5 8z"/><path d="M13 10L6 6M33 10l7-4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="23" cy="16" r="7"/><path d="M14 25h18l5 27H9z"/><circle cx="20" cy="15" r="2" fill="#0b0f0e"/><circle cx="26" cy="15" r="2" fill="#0b0f0e"/>`,
  likho: `<path d="M23 4c9 0 15 7 15 16 0 7-4 13-9 15l2 17h-8l-2-17c-5-2-9-8-9-15 0-9 6-16 11-16z"/><circle cx="23" cy="19" r="7" fill="#0b0f0e"/><circle cx="23" cy="19" r="3"/><path d="M6 30L0 44l5 2 6-12z"/>`,
  mavka: `<path d="M15 9c0-5 4-9 8-9s8 4 8 9c0 9-2 16-4 21h-8c-2-5-4-12-4-21z"/><path d="M19 15h8c3 12 3 26 1 37h-10c-2-11-2-25 1-37z"/>`,
  molnienosets: `<path d="M34 0l-6 14 8-1-14 20 4-13-8 2z"/><circle cx="16" cy="18" r="6"/><path d="M8 26h16l4 14-6 2-1 10h-4l-1-10h-1l-1 10h-4l-1-10-6-2z"/>`,
  oblachnik: `<circle cx="23" cy="11" r="6"/><path d="M16 19h14l3 13H13z"/><path d="M6 36c0-4 4-7 8-6 2-4 8-5 11-2 4-1 8 1 9 5 3 0 5 2 5 5H4c0-1 1-2 2-2z"/><path d="M8 47h30" stroke="currentColor" stroke-width="2.5" fill="none"/>`,
  rusalka: `<circle cx="23" cy="9" r="6"/><path d="M12 15s5-5 11-5 11 5 11 5c2 12 0 22-4 29-4-4-10-4-14 0-4-7-6-17-4-29z"/><path d="M17 43c4 4 8 4 12 0l7 9H10z"/>`,
  strelets: `<path d="M33 2c11 10 11 34 0 44l-4-3c9-9 9-29 0-38z"/><path d="M31 5L22 24l9 19" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="16" r="6"/><path d="M5 24h14l3 15-5 2-1 11h-4l-1-11-5-2z"/>`,
  upyr: `<path d="M23 2c6 0 10 4 10 10 0 3-1 5-3 7l2 5H14l2-5c-2-2-3-4-3-7 0-6 4-10 10-10z"/><path d="M18 11c2-2 8-2 10 0-2 3-8 3-10 0z" fill="#0b0f0e"/><path d="M15 24h16l15 28H0z"/><path d="M8 52l7-14M38 52l-7-14" stroke="#0b0f0e" stroke-width="2" fill="none"/>`,
  vedma: `<path d="M23 0l9 18H14z"/><path d="M10 18h26v4H10z"/><circle cx="23" cy="27" r="5"/><path d="M16 32h14l5 20H11z"/><rect x="38" y="14" width="2.6" height="38"/><path d="M33 46h12v4H33z"/>`,
  vodyanoy: `<path d="M9 9L13 1l5 5 5-6 5 6 5-5 4 8z"/><path d="M23 6c12 0 20 9 20 20 0 9-5 16-12 19l3 7H15l3-7C11 42 6 35 6 26 6 15 14 6 23 6z"/><circle cx="16" cy="24" r="3.6" fill="#0b0f0e"/><circle cx="30" cy="24" r="3.6" fill="#0b0f0e"/><path d="M18 33h10c0 3-2 5-5 5s-5-2-5-5z" fill="#0b0f0e"/>`,
  volk: `<path d="M2 30l7-9 8 3h13l7-4 5-9 3 2-3 10c2 3 3 6 3 10v11h-5v-8h-7v8h-5v-8H16v8h-5v-8c-4-1-7-3-9-6z"/><path d="M38 12l4-6 1 7z"/><circle cx="40" cy="15" r="1.8" fill="#0b0f0e"/>`,
  volkhv: `<circle cx="21" cy="9" r="7"/><path d="M12 19h18l8 33H4z"/><rect x="39" y="6" width="3" height="46"/><circle cx="40.5" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/>`,
  vurdalak: `<circle cx="27" cy="12" r="6"/><path d="M14 21c4-3 12-3 17 0l3 15-7 3-2 13h-5l-1-13-8-3z"/><path d="M14 24L2 36l4 4 11-10zM34 25l9 13-5 3-8-11z"/>`,
  yaga: `<circle cx="21" cy="8" r="6"/><path d="M14 16h14l2 8H12z"/><path d="M8 26h30l-5 24H13z"/><rect x="36" y="4" width="3" height="26" transform="rotate(18 37 17)"/><path d="M6 26h34" stroke="currentColor" stroke-width="3" fill="none"/>`,
  zharptitsa: `<path d="M22 6c4 0 7 3 7 7 0 4-2 7-5 9l4 8-8 6-3-10c-4-2-6-6-6-10 0-6 5-10 11-10z"/><path d="M17 20L1 10l4 13-5 3 17 9zM31 16l14-9-3 12 4 3-15 7z"/><path d="M22 32l3 18-6-4-2-12z"/>`,
  zmora: `<path d="M23 2c6 0 10 5 10 11 0 8-3 16-3 24 0 5-3 9-7 9s-7-4-7-9c0-8-3-16-3-24 0-6 4-11 10-11z"/><circle cx="19" cy="12" r="2.6" fill="#0b0f0e"/><circle cx="27" cy="12" r="2.6" fill="#0b0f0e"/><path d="M16 46c4 4 10 4 14 0l-3 6H19z"/>`,
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
