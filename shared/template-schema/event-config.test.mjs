import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventTemplateConfig } from './event-config.mjs';
import catalog from './free-templates.json' with { type: 'json' };

test('event template config includes the supported schema and complete variant layouts', () => {
  const source = catalog.templates[0];
  const config = buildEventTemplateConfig({
    id: source.id,
    version: 3,
    versionId: `${source.id}-v3`,
    template: { ...source.template, variants: source.variants },
  });

  assert.equal(config.templateSchemaVersion, '1.0');
  assert.equal(config.template.schemaVersion, '1.0');
  assert.equal(config.templateVersion, 3);
  assert.equal(config.template.templateVersion, 3);
  assert.deepEqual(Object.keys(config.template.variants).sort(), ['color', 'thermal58', 'thermal80']);
  assert.ok(config.template.elements.length > 0);
});

test('event template config rejects schemas the mobile contract does not support', () => {
  assert.throws(() => buildEventTemplateConfig({ id: 'custom', template: { schemaVersion: '2.0' } }), /Unsupported template schema version/);
});

test('legacy templates receive automatic orientation defaults when synchronized', () => {
  const config = buildEventTemplateConfig({ id: 'legacy-landscape', template: { schemaVersion: '1.0', width: 1800, height: 750, outputFormat: 'landscape', elements: [] } });
  assert.equal(config.template.orientation, 'landscape');
  assert.equal(config.template.printSettings.printOrientation, 'auto');
  assert.equal(config.template.printSettings.thermalRotation, 'clockwise');
  assert.deepEqual(config.template.printSettings.printableWidths, { thermal58: 384, thermal80: 576 });
});
