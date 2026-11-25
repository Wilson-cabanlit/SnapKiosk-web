export function getTemplateOrientation(template) {
  const width = Number(template?.width) || 0;
  const height = Number(template?.height) || 0;
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

export function getThermalRasterSize(template, {
  printableWidth = 384,
  printOrientation = template?.printSettings?.printOrientation || 'auto',
  thermalRotation = template?.printSettings?.thermalRotation || 'clockwise',
} = {}) {
  const orientation = getTemplateOrientation(template);
  const rotate = printOrientation === 'rotate-clockwise' || printOrientation === 'rotate-counterclockwise' || (printOrientation === 'auto' && orientation === 'landscape');
  const direction = printOrientation === 'rotate-counterclockwise' ? 'counterclockwise' : printOrientation === 'rotate-clockwise' ? 'clockwise' : thermalRotation;
  const rotatedWidth = rotate ? template.height : template.width;
  const rotatedHeight = rotate ? template.width : template.height;
  const scale = printableWidth / rotatedWidth;
  return {
    orientation,
    rotationDegrees: rotate ? (direction === 'counterclockwise' ? -90 : 90) : 0,
    rotatedWidth,
    rotatedHeight,
    width: printableWidth,
    height: Math.round(rotatedHeight * scale),
    scale,
  };
}
