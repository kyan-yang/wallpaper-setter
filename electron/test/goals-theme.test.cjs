const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_GOALS_THEME_COLOR,
  normalizeThemeColor,
  normalizeGoalsDraft,
  buildThemePalette,
} = require('../dist/shared/goals-theme.js');

test('normalizeThemeColor maps legacy theme values to color hex', () => {
  assert.equal(normalizeThemeColor('minimalDark'), '#1f1f1f');
  assert.equal(normalizeThemeColor('minimalLight'), '#f2f2f2');
});

test('normalizeThemeColor accepts hex values and expands short form', () => {
  assert.equal(normalizeThemeColor('#ABC'), '#aabbcc');
  assert.equal(normalizeThemeColor('#123456'), '#123456');
});

test('normalizeThemeColor falls back for invalid input', () => {
  assert.equal(normalizeThemeColor(''), DEFAULT_GOALS_THEME_COLOR);
  assert.equal(normalizeThemeColor('beige'), DEFAULT_GOALS_THEME_COLOR);
  assert.equal(normalizeThemeColor(null), DEFAULT_GOALS_THEME_COLOR);
});

test('normalizeGoalsDraft sanitizes unknown draft shape', () => {
  assert.deepEqual(normalizeGoalsDraft({}), {
    title: '',
    goalsText: '',
    theme: DEFAULT_GOALS_THEME_COLOR,
  });

  assert.deepEqual(normalizeGoalsDraft({
    title: 'Focus',
    goalsText: 'Ship it',
    theme: 'minimalLight',
  }), {
    title: 'Focus',
    goalsText: 'Ship it',
    theme: '#f2f2f2',
  });
});

test('buildThemePalette uses readable text color for light and dark themes', () => {
  const darkPalette = buildThemePalette('#1f1f1f');
  const lightPalette = buildThemePalette('#f2f2f2');

  assert.equal(darkPalette.textRgb, '255,255,255');
  assert.equal(lightPalette.textRgb, '0,0,0');
  assert.notEqual(darkPalette.gradientTopHex, darkPalette.gradientBottomHex);
  assert.notEqual(lightPalette.gradientTopHex, lightPalette.gradientBottomHex);
});
