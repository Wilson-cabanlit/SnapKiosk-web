import test from 'node:test';
import assert from 'node:assert/strict';
import { getTemplateOrientation, getThermalRasterSize } from './print-orientation.mjs';

test('automatic thermal print rotates landscape master uniformly to 58mm width', () => {
  const layout = { width: 1800, height: 750, printSettings: { printOrientation: 'auto', thermalRotation: 'clockwise' } };
  const result = getThermalRasterSize(layout, { printableWidth: 384 });
  assert.equal(getTemplateOrientation(layout), 'landscape');
  assert.equal(result.rotationDegrees, 90);
  assert.equal(result.width, 384);
  assert.equal(result.height, 922);
  assert.equal(result.scale, 384 / 750);
});

test('automatic thermal print preserves portrait layouts and supports counterclockwise rotation', () => {
  const portrait = { width: 750, height: 1800 };
  assert.equal(getThermalRasterSize(portrait, { printableWidth: 576 }).rotationDegrees, 0);
  assert.equal(getThermalRasterSize({ width: 1800, height: 750 }, { printableWidth: 576, printOrientation: 'rotate-counterclockwise' }).rotationDegrees, -90);
});
