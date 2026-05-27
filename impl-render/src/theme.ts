export interface Theme {
  bg: string;
  laneBg: string;
  laneAltBg: string;
  laneBorder: string;
  laneLabel: string;
  nodeFill: string;
  nodeStroke: string;
  text: string;
  edge: string;
  fontFamily: string;
  fontSize: number;
}

export const lightTheme: Theme = {
  bg: '#ffffff',
  laneBg: '#fafafa',
  laneAltBg: '#f0f0f0',
  laneBorder: '#d0d0d0',
  laneLabel: '#333333',
  nodeFill: '#ffffff',
  nodeStroke: '#333333',
  text: '#111111',
  edge: '#333333',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 13,
};

export const darkTheme: Theme = {
  bg: '#1a1a1a',
  laneBg: '#222222',
  laneAltBg: '#2a2a2a',
  laneBorder: '#444444',
  laneLabel: '#dddddd',
  nodeFill: '#2a2a2a',
  nodeStroke: '#cccccc',
  text: '#eeeeee',
  edge: '#cccccc',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 13,
};

export type ThemeName = 'light' | 'dark';

export function resolveTheme(name: ThemeName | Theme | undefined): Theme {
  if (!name) return lightTheme;
  if (typeof name === 'object') return name;
  return name === 'dark' ? darkTheme : lightTheme;
}
