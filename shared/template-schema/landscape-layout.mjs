const element = (id, type, x, y, width, height, props = {}) => ({ id, type, x, y, width, height, zIndex: props.zIndex ?? 1, ...props });

export function makeLandscapeLayout(spec, format) {
  const mono = format !== 'color';
  const [background, ink, accent, paper] = mono
    ? ['#ffffff', '#111111', '#111111', '#ffffff']
    : spec.palette;
  const width = 1800;
  const height = 1000;
  const elements = [];
  const shape = (id, x, y, w, h, fill = accent, zIndex = 0) => elements.push(element(id, 'shape', x, y, w, h, { fill, zIndex }));
  const text = (id, value, x, y, w, h, fontSize = 30, extra = {}) => elements.push(element(id, 'text', x, y, w, h, { text: value, fontSize, color: extra.color || ink, align: extra.align || 'left', fontFamily: extra.fontFamily || 'sans-serif', ...extra }));
  const photo = (index, x, y, w, h) => elements.push(element(`photo-${index + 1}`, 'photo', x, y, w, h, { fit: 'cover', fill: paper, zIndex: 2 }));
  const style = spec.category === 'Boarding Pass' ? (spec.styleIndex || 0) : (spec.styleIndex || 0) % 18;
  const mode = spec.landscapeMode || 'boarding-pass';
  const photos = mode.includes('collage') ? 4 : mode.includes('film-strip') ? 3 : mode.includes('two-photo') ? 2 : 1;
  shape('paper', 0, 0, width, height, background, -2);
  shape('top-accent', 0, 0, width, 18 + (style % 4) * 5, ink, -1);

  if (mode.includes('newspaper')) {
    shape('masthead-band', 34, 35, 1732, 126, ink);
    text('masthead', spec.short.toUpperCase(), 58, 50, 1684, 70, 46, { color: paper, align: 'center', fontFamily: 'serif' });
    text('edition', 'SPECIAL EDITION  ·  {{event.date}}  ·  {{event.venue}}', 60, 123, 1680, 28, 18, { color: paper, align: 'center' });
    text('headline', 'A MOMENT WORTH THE HEADLINES', 58, 190, 960, 120, 48, { fontFamily: 'serif' });
    text('names', '{{event.coupleNames}}', 58, 318, 960, 60, 34, { color: accent, fontFamily: 'serif' });
    photo(0, 1080, 195, 650, 520);
    text('story', 'Friends and family gathered at {{event.venue}} to celebrate a day to remember.', 58, 415, 960, 170, 28, { fontFamily: 'serif' });
    text('footer', 'EXTRA! EXTRA! KEEP THIS MEMORY FOREVER', 58, 825, 1684, 46, 20, { align: 'center' });
  } else if (mode.includes('postcard')) {
    photo(0, 40, 48, 1010, 690);
    shape('postcard-divider', 1080, 54, 3, 850, ink, 1);
    shape('stamp-outline', 1600, 70, 125, 145, paper, 2);
    text('stamp', '✦', 1608, 85, 110, 100, 58, { color: accent, align: 'center' });
    text('postcard-title', 'GREETINGS FROM', 1120, 270, 600, 58, 28, { fontFamily: 'serif' });
    text('venue', '{{event.venue}}', 1120, 340, 600, 95, 50, { color: accent, fontFamily: 'serif' });
    text('names', '{{event.coupleNames}}  ·  {{event.date}}', 1120, 500, 610, 110, 27, { fontFamily: 'serif' });
    text('qr-caption', 'SCAN FOR YOUR GALLERY', 1120, 765, 610, 36, 18, { align: 'center' });
    text('qr-placeholder', '{{session.qrCode}}', 1350, 810, 150, 150, 18, { align: 'center' });
  } else if (mode.includes('film-strip')) {
    shape('film-body', 30, 55, 1740, 890, ink);
    for (let i = 0; i < 14; i++) {
      shape(`sprocket-top-${i}`, 58 + i * 122, 76, 72, 35, paper, 1);
      shape(`sprocket-bottom-${i}`, 58 + i * 122, 888, 72, 35, paper, 1);
    }
    const gap = 26, left = 92, photoW = 510, photoY = 170, photoH = 560;
    for (let i = 0; i < 3; i++) photo(i, left + i * (photoW + gap), photoY, photoW, photoH);
    text('film-caption', '{{event.coupleNames}}  ·  {{event.date}}  ·  {{business.name}}', 85, 770, 1630, 72, 27, { color: paper, align: 'center', fontFamily: 'serif' });
  } else if (mode.includes('collage')) {
    shape('collage-mat', 32, 34, 1736, 932, paper, -1);
    const gap = 18, left = 54, top = 54, cellW = 830, cellH = 365;
    for (let i = 0; i < 4; i++) photo(i, left + (i % 2) * (cellW + gap), top + Math.floor(i / 2) * (cellH + gap), cellW, cellH);
    text('collage-caption', '{{event.coupleNames}}  ·  {{event.date}}', 70, 840, 1660, 70, 30, { color: ink, align: 'center', fontFamily: 'serif' });
  } else {
    const ticketMode = mode.includes('ticket') || mode.includes('pass') || mode.includes('boarding') || mode.includes('train') || mode.includes('cruise') || mode.includes('bus') || mode.includes('cinema') || mode.includes('concert') || mode.includes('festival') || mode.includes('arcade');
    const stubX = 1390 + (style % 4) * 4;
    shape('ticket-header', 34, 34, 1732, 126, ink);
    text('brand', `{{business.name}}  ·  ${spec.short}`, 70, 61, 1535, 66, 39, { color: paper, fontFamily: 'serif' });
    text('airplane-silhouette', ticketMode ? '✈' : '✦', 1640, 55, 90, 86, 54, { color: paper, align: 'center' });
    shape('photo-panel', 48, 190, 610 + style * 2, 610, paper, 0);
    if (photos === 1) photo(0, 66, 208, 574 + style * 2, 574);
    else {
      const n = photos, gap = 12, photoW = Math.floor((588 - gap * (n - 1)) / n);
      for (let i = 0; i < n; i++) photo(i, 66 + i * (photoW + gap), 208, photoW, 574);
    }
    text('guest-label', mode.includes('boarding') || mode.includes('pass') ? 'PASSENGER / GUEST' : 'EVENT GUEST', 725, 205, 570, 38, 19, { color: accent });
    text('guest-name', '{{event.coupleNames}}', 725, 247, 590, 72, 40, { fontFamily: 'serif' });
    text('event-title', spec.short.toUpperCase(), 725, 342, 590, 54, 26, { color: accent });
    text('from', 'FROM  ·  {{event.venue}}', 725, 426, 590, 44, 21);
    text('destination', mode.includes('boarding') || mode.includes('pass') ? 'TO  ·  FOREVER' : 'ADMIT ONE  ·  KEEP THIS MOMENT', 725, 478, 590, 54, 25, { color: accent, fontFamily: 'serif' });
    text('reference', 'EVENT REF  {{event.reference}}', 725, 565, 280, 40, 18);
    text('seat', 'SEAT  ·  VIP', 1015, 565, 290, 40, 18);
    text('date', '{{event.date}}', 725, 616, 590, 42, 20);
    text('event-time', 'EVENT TIME  ·  {{event.startTime}}', 725, 665, 590, 38, 18);
    text('novelty', 'PHOTO BOOTH SOUVENIR · NOT VALID FOR TRAVEL', 725, 720, 590, 42, 17, { color: accent });
    shape('stub-cutline', stubX, 183, 3, 630, accent, 1);
    for (let i = 0; i < 16; i++) shape(`stub-dash-${i}`, stubX - 5, 194 + i * 38, 13, 16, paper, 2);
    text('stub-title', 'KEEP THIS', stubX + 34, 215, 310, 42, 18, { align: 'center' });
    text('qr-placeholder', '{{session.qrCode}}', stubX + 112, 300, 140, 140, 16, { align: 'center' });
    text('qr-label', 'SCAN FOR PHOTOS', stubX + 28, 455, 315, 35, 16, { align: 'center' });
    for (let i = 0; i < 17; i++) {
      const barWidth = [5, 9, 4, 13, 7, 3][(i + style) % 6];
      shape(`decorative-bar-${i}`, stubX + 50 + i * 13, 555, barWidth, 88 + (i % 3) * 8, ink, 1);
    }
    text('barcode-note', 'DECORATIVE · NOT A TRAVEL CODE', stubX + 22, 665, 330, 34, 13, { align: 'center' });
    text('footer', 'A PHOTO BOOTH KEEPSAKE  ·  {{event.venue}}', 48, 868, 1704, 48, 18, { align: 'center' });
  }

  return {
    schemaVersion: '1.0',
    templateVersion: 1,
    outputFormat: mono ? `thermal-${format === 'thermal58' ? '58' : '80'}mm-master` : 'landscape-master',
    width,
    height,
    orientation: 'landscape',
    printSettings: { printOrientation: 'auto', thermalRotation: 'clockwise', printableWidths: { thermal58: 384, thermal80: 576 }, digitalReceiptOrientation: 'original' },
    background,
    elements,
    metadata: { category: spec.category, free: true, builtIn: true, requiredPhotoCount: photos, supportedPaperFormats: ['color', 'thermal58', 'thermal80'], digitalOutputs: ['digital-copy.png', 'receipt-copy.png', 'animated-copy.gif', 'original-photo-01.jpg', 'thumbnail.png'], dynamicVariables: ['event.name', 'event.coupleNames', 'event.date', 'event.venue', 'event.startTime', 'event.reference', 'business.name', 'session.captureDate', 'session.captureTime', 'session.qrCode'], gif: { enabled: true, animatePhotoLayerOnly: true, preserveStaticLayers: true }, compatibility: { schemaVersion: '1.0', requiredElements: ['photo', 'text', 'shape'], minimumMobileAppVersion: null, requiresQrVariable: true } },
  };
}
