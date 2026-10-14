/**
 * Studio canvas stroke colors (SVG). Hex mirrors `index.css` canvas / semantic intent.
 * Update alongside `--edge-color`, `--handle-color`, and semantic palette docs.
 */
export const STUDIO_CANVAS_HEX = {
  /** Default sequence / spine — ~ `--edge-color` light */
  sequence: '#94a3b8',
  /** Fork / branch routes — warning family */
  fork: '#d97706',
  merge: '#b45309',
  joinNext: '#16a34a',
  loop: '#0284c7',
  nodeBorderDefault: '#94a3b8',
  controlBorder: '#c6c6cd',
  controlIcon: '#64748b',
  controlHoverBg: '#f1f5f9',
  controlHoverIcon: '#475569',
} as const;
