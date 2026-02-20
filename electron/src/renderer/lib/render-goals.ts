import type { GoalsDraft } from '../types';
import { buildThemePalette } from '../../shared/goals-theme';

export async function renderGoals(
  draft: GoalsDraft,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const palette = buildThemePalette(draft.theme);

  // Background gradient (top to bottom)
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.gradientTopHex);
  gradient.addColorStop(1, palette.gradientBottomHex);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const textColor = palette.textRgb;
  const horizontalInset = width * 0.08;
  const maxWidth = width - horizontalInset * 2;
  let y = height * 0.28;

  // Title
  if (draft.title.trim()) {
    ctx.font = `bold 56px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = `rgba(${textColor},0.95)`;
    ctx.textBaseline = 'top';
    ctx.fillText(draft.title, horizontalInset, y, maxWidth);
    y += 90;
  }

  // Goal lines
  const lines = draft.goalsText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  ctx.font = `500 36px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = `rgba(${textColor},0.90)`;
  for (const line of lines) {
    ctx.fillText(`• ${line}`, horizontalInset, y, maxWidth);
    y += 62;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to export canvas'));
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      },
      'image/png',
    );
  });
}
