export const DEFAULT_GOALS_THEME_COLOR = '#1f1f1f';

const LEGACY_THEME_COLOR_MAP: Record<string, string> = {
  minimalDark: '#1f1f1f',
  minimalLight: '#f2f2f2',
};

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface NormalizedGoalsDraft {
  title: string;
  goalsText: string;
  theme: string;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function channelToHex(value: number): string {
  return clampChannel(value).toString(16).padStart(2, '0');
}

function parseHexColor(hex: string): RgbColor {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function serializeHexColor(color: RgbColor): string {
  return `#${channelToHex(color.r)}${channelToHex(color.g)}${channelToHex(color.b)}`;
}

function expandShortHexColor(color: string): string {
  if (color.length === 7) return color.toLowerCase();
  const [, r, g, b] = color.toLowerCase();
  return `#${r}${r}${g}${g}${b}${b}`;
}

function mixColors(base: RgbColor, target: RgbColor, weight: number): RgbColor {
  return {
    r: base.r + (target.r - base.r) * weight,
    g: base.g + (target.g - base.g) * weight,
    b: base.b + (target.b - base.b) * weight,
  };
}

export function normalizeThemeColor(theme: unknown): string {
  if (typeof theme !== 'string') return DEFAULT_GOALS_THEME_COLOR;

  const candidate = theme.trim();
  if (!candidate) return DEFAULT_GOALS_THEME_COLOR;

  const legacyMatch = LEGACY_THEME_COLOR_MAP[candidate];
  if (legacyMatch) return legacyMatch;

  if (!HEX_COLOR_PATTERN.test(candidate)) return DEFAULT_GOALS_THEME_COLOR;

  return expandShortHexColor(candidate);
}

export function normalizeGoalsDraft(draft: unknown): NormalizedGoalsDraft {
  const source = (draft && typeof draft === 'object') ? draft as Record<string, unknown> : {};

  return {
    title: typeof source.title === 'string' ? source.title : '',
    goalsText: typeof source.goalsText === 'string' ? source.goalsText : '',
    theme: normalizeThemeColor(source.theme),
  };
}

export function buildThemePalette(theme: unknown): {
  baseHex: string;
  gradientTopHex: string;
  gradientBottomHex: string;
  textRgb: string;
} {
  const baseHex = normalizeThemeColor(theme);
  const baseRgb = parseHexColor(baseHex);
  const gradientTopHex = serializeHexColor(mixColors(baseRgb, { r: 255, g: 255, b: 255 }, 0.18));
  const gradientBottomHex = serializeHexColor(mixColors(baseRgb, { r: 0, g: 0, b: 0 }, 0.26));
  const relativeLuminance = (0.2126 * baseRgb.r + 0.7152 * baseRgb.g + 0.0722 * baseRgb.b) / 255;
  const textRgb = relativeLuminance > 0.56 ? '0,0,0' : '255,255,255';

  return {
    baseHex,
    gradientTopHex,
    gradientBottomHex,
    textRgb,
  };
}
