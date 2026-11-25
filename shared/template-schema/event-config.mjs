import { getTemplateOrientation } from './print-orientation.mjs';

export const SUPPORTED_TEMPLATE_SCHEMA_VERSIONS = Object.freeze(['1.0']);

export function buildEventTemplateConfig(item) {
  const template = item?.template;
  const templateSchemaVersion = template?.schemaVersion;
  if (!SUPPORTED_TEMPLATE_SCHEMA_VERSIONS.includes(templateSchemaVersion)) {
    throw new Error(`Unsupported template schema version: ${templateSchemaVersion || 'missing'}`);
  }
  if (!isSupportedLayout(template)) {
    throw new Error('Template does not match the supported photo/text/shape layout schema.');
  }
  for (const layout of Object.values(template.variants || {})) {
    if (!isSupportedLayout(layout)) {
      throw new Error('Template contains a variant with an unsupported layout schema.');
    }
  }

  const templateVersion = Number(item.version || template.templateVersion || 1);
  const versionId = item.versionId || `${item.id}-v${templateVersion}`;
  const normalizedTemplate = {
    ...template,
    templateVersion,
    orientation: getTemplateOrientation(template),
    printSettings: {
      printOrientation: 'auto',
      thermalRotation: 'clockwise',
      printableWidths: { thermal58: 384, thermal80: 576 },
      digitalReceiptOrientation: 'original',
      ...template.printSettings,
      printableWidths: { thermal58: 384, thermal80: 576, ...template.printSettings?.printableWidths },
    },
  };

  return {
    templateId: item.id,
    templateVersionId: versionId,
    templateVersion,
    templateSchemaVersion,
    template: normalizedTemplate,
  };
}

function isSupportedLayout(layout) {
  return Boolean(
    layout &&
      typeof layout.outputFormat === 'string' &&
      Number.isInteger(layout.width) &&
      Number.isInteger(layout.height) &&
      Array.isArray(layout.elements) &&
      layout.elements.every(element =>
        element &&
        typeof element.id === 'string' &&
        ['photo', 'text', 'shape', 'graphic'].includes(element.type) &&
        ['x', 'y', 'width', 'height'].every(key => Number.isFinite(element[key])),
      ),
  );
}
