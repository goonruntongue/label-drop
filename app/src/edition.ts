// This source is published as two editions:
//  - Label Drop (the default build; GitHub Pages): the game. Opening, 3D characters, levels and titles.
//  - IA仕分け練習 (`vite build --mode portal`; the knowledge portal's about-ia/app/dist): the same
//    sorting-and-naming practice as a plain tool. The portal is an information site, so everything
//    that is there for entertainment is left out: no opening, no characters, no levelling up, no
//    celebration effects. Stars and the one-line comment on the answer check stay.
export const PORTAL = import.meta.env.MODE === 'portal';

export const APP_NAME = PORTAL ? 'IA仕分け練習' : 'Label Drop';
