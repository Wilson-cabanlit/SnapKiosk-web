import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeLandscapeLayout } from './landscape-layout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const groups = [
  ['Boarding Pass', 'ticket', ['Classic Blue Airline Boarding Pass','Luxury First Class Boarding Pass','Wedding Love Airlines','Vintage Boarding Pass','Thermal Boarding Pass','Train Ticket','Cruise Ticket','Wedding Passport','Cinema Admission Ticket','Concert Ticket','Festival Ticket','VIP Admission Pass']],
  ['Receipt', 'receipt', ['Classic Thermal Receipt','Wedding Love Receipt','Coffee Shop Receipt','Restaurant Receipt','Grocery Receipt','Retro Transaction Receipt','Minimalist Receipt','Receipt with Decorative Borders']],
  ['Newspaper', 'editorial', ['Wedding Daily Newspaper','Breaking News Wedding','Vintage Newspaper','Magazine Cover','Retro Wanted Poster','Comic Strip','Celebrity Cover','Front Page Story']],
  ['Wedding', 'wedding', ['Elegant Gold Wedding','Classic White Wedding','Garden Floral Wedding','Sage Green Botanical Wedding','Romantic Pink Wedding','Luxury Black and Gold','Rustic Wedding','Bohemian Wedding','Vintage Wedding','Modern Minimalist Wedding']],
  ['Korean', 'strip', ['Classic Four Cut','Pastel Pink','Pastel Blue','Cute Doodle','Korean Minimalist','Retro Korean Film Strip']],
  ['Photography', 'photo', ['Classic Polaroid','Vintage Film Negative','Cinema Film Strip','Single Portrait','Double Photo Strip','Triple Photo Strip','Four Photo Strip','Two-by-Two Collage']],
  ['Creative', 'creative', ['Music Player','Social Media Frame','Chat Conversation','Postcard','Scrapbook','Playing Card','Retro Arcade','Vintage Photo Album']],
];
const palettes = [
  ['#eaf2fa','#183a63','#3977a9','#ffffff'],['#f4ead8','#4a3425','#ad8358','#fffaf1'],['#ffeaf2','#6e2946','#b85e83','#fff8fb'],
  ['#f1eee6','#36352f','#a28d67','#ffffff'],['#e5eee8','#31564a','#729782','#fbfdf9'],['#f5e9e3','#713e37','#c2786e','#fffaf7'],
  ['#f2eadb','#493c2a','#ad8952','#fffcf6'],['#e8e4f2','#473b69','#8c79b7','#fbfaff'],['#e7f1f7','#264d67','#5b91ac','#fbfdff'],
  ['#f8efd6','#4c422b','#bd9d3b','#fffdf6'],['#e9e8e2','#343d41','#788a8c','#ffffff'],['#f4e8dc','#5a3b2e','#b66f43','#fffaf4'],
];
const modes = {
  ticket:['ticketStub','ticketPassport','ticketPhoto','ticketPerforated','ticketWide','ticketVertical','ticketCinema','ticketConcert','ticketVip','ticketMap','ticketWaves','ticketCompact'],
  receipt:['receiptCentered','receiptPhotoHeader','receiptOrder','receiptBorder','receiptMinimal','receiptDoublePhoto','receiptCoupon','receiptVintage'],
  editorial:['newsMasthead','newsBreaking','newsColumns','magazineCover','wantedPoster','comicPanels','celebrityCover','newsStory'],
  wedding:['weddingHero','weddingDiptych','weddingArch','weddingBotanical','weddingHeart','weddingNoir','weddingRustic','weddingBoho','weddingVintage','weddingMinimal'],
  strip:['stripFour','stripPastel','stripBlue','stripDoodle','stripMinimal','stripNegative'],
  photo:['photoPolaroid','photoNegative','photoCinema','photoPortrait','photoDouble','photoTriple','photoFour','photoGrid'],
  creative:['creativeMusic','creativeSocial','creativeChat','creativePostcard','creativeScrapbook','creativeCard','creativeArcade','creativeAlbum'],
};
const landscapeAdditions = [
  ['Classic Black-and-White Boarding Pass','Boarding Pass','classic-boarding'],
  ['First Class Wedding Ticket','Boarding Pass','first-class'],
  ['Luxury Gold Boarding Pass','Boarding Pass','gold-boarding'],
  ['Bus Ticket','Boarding Pass','bus-ticket'],
  ['VIP Travel Pass','Boarding Pass','vip-travel'],
  ['VIP Event Pass','Boarding Pass','vip-event'],
  ['Retro Arcade Ticket','Creative','arcade-ticket'],
  ['Travel Postcard','Creative','postcard'],
  ['Horizontal Film Strip','Photography','film-strip'],
  ['Vintage Newspaper Headline','Newspaper','newspaper-headline'],
  ['Wedding Invitation Ticket','Wedding','wedding-ticket'],
  ['Horizontal Wedding Photo Collage','Wedding','collage'],
];
const safeId = value => value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const E=(id,type,x,y,width,height,extra={})=>({id,type,x,y,width,height,zIndex:extra.zIndex??1,...extra});
function layout(spec, format) {
  if(spec.orientation==='landscape') return makeLandscapeLayout(spec,format);
  const thermal=format!=='color';
  const horizontal=spec.category==='Boarding Pass'&&format==='color';
  const width=thermal?(format==='thermal58'?384:576):(horizontal?1800:1200);
  const height=thermal?(format==='thermal58'?1500:1800):(horizontal?1200:1800);
  // Layout coordinates are authored in output pixels. Thermal 58mm keeps the
  // same horizontal dot positions as 80mm and compresses only the vertical axis.
  // The landscape boarding pass is authored directly on its 1800x1200 canvas.
  const scaleY=horizontal?1:height/1800,fontScale=1;
  const bg=thermal?'#ffffff':spec.palette[0],ink=thermal?'#111111':spec.palette[1],accent=thermal?'#111111':spec.palette[2],paper=thermal?'#ffffff':spec.palette[3];
  const x=v=>Math.round(v), y=v=>Math.round(v*scaleY), elems=[];
  const text=(id,value,left,top,w,h,size=40,extra={})=>elems.push(E(id,'text',x(left),y(top),x(w),y(h),{text:value,fontSize:Math.max(12,Math.round(size*fontScale)),color:ink,align:'left',...extra}));
  const shape=(id,left,top,w,h,fill=accent,extra={})=>elems.push(E(id,'shape',x(left),y(top),x(w),y(h),{fill,zIndex:extra.zIndex??0,...extra}));
  const photo=(index,left,top,w,h,extra={})=>elems.push(E(`photo-${index+1}`,'photo',x(left),y(top),x(w),y(h),{fit:'cover',fill:thermal?'#eeeeee':paper,zIndex:1,...extra}));
  const count=spec.mode.includes('Four')||spec.mode.includes('four')?4:spec.mode.includes('Triple')||spec.mode.includes('triple')?3:spec.mode.includes('Double')||spec.mode.includes('double')||spec.mode.includes('Diptych')||spec.mode.includes('diptych')||spec.mode.includes('comicPanels')?2:spec.mode.includes('Grid')||spec.mode.includes('grid')?4:1;
  // Category-specific compositions keep the same artwork identity while using real format geometry.
  if(spec.category==='Boarding Pass'){
    if(horizontal){
      shape('ticket-header',0,0,1800,185,ink); text('brand','{{business.name}} · '+spec.short,55,30,1450,90,52,{color:paper,fontFamily:'serif'});text('airplane-icon','✈',1590,35,130,95,58,{color:paper,align:'center'});
      photo(0,75,255,610,720,{fill:paper}); text('stub-cutline','┆\n┆\n┆\n┆\n┆\n┆\n┆\n┆\n┆\n┆\n┆',720,230,45,790,38,{align:'center',color:accent});
      text('passenger-label','PASSENGER',805,265,850,60,26,{color:accent});text('passenger','{{event.coupleNames}}',805,325,850,115,54,{fontFamily:'serif'});
      text('route','FROM  ·  {{event.venue}}',805,485,850,75,29);text('destination','TO  ·  FOREVER',805,575,850,90,44,{fontFamily:'serif',color:accent});
      text('flight','EVENT REF  {{event.reference}}',805,690,440,65,25);text('seat','SEAT  VIP',1290,690,360,65,25);text('boarding','BOARDING  {{event.startTime}}',805,760,800,65,25);
      text('qr-label','SCAN FOR YOUR PHOTO GALLERY',805,900,800,45,20);text('qr-placeholder','{{session.qrCode}}',805,950,120,120,16);text('footer','A souvenir for the journey of a lifetime · {{event.date}}',950,985,700,55,18,{align:'center'});
      text('novelty','NOVELTY KEEPSAKE · NOT VALID FOR TRAVEL',50,1100,1700,48,18,{align:'center',color:ink});
    }else{
      shape('ticket-header',0,0,width,145,ink);text('brand','✈  {{business.name}}',25,24,width-50,60,35,{color:paper,align:'center'});text('ticket-title',spec.short,25,95,width-50,50,24,{color:paper});
      photo(0,30,180,width-60,300,{fill:paper});text('passenger-label','PASSENGER',30,500,width-60,38,18);text('passenger','{{event.coupleNames}}',30,540,width-60,70,30,{fontFamily:'serif'});
      text('venue','VENUE  {{event.venue}}',30,630,width-60,50,19);text('destination','DESTINATION  FOREVER',30,690,width-60,50,20);
      shape('separator',25,755,width-50,4,ink);text('trip','EVENT  {{event.reference}}  ·  SEAT VIP',30,785,width-60,48,18);text('date','DATE  {{event.date}}  ·  {{event.startTime}}',30,840,width-60,48,18);
      text('qr-label','SCAN FOR YOUR PHOTO GALLERY',30,920,width-60,42,16,{align:'center'});text('qr-placeholder','{{session.qrCode}}',Math.round(width/2-75),970,150,150,16,{align:'center'});text('legal','NOVELTY SOUVENIR · NOT VALID FOR TRAVEL',20,1180,width-40,45,14,{align:'center'});
    }
  } else if(spec.category==='Receipt'){
    const border=spec.mode==='receiptBorder';if(border){shape('receipt-border-top',16,14,width-32,12,ink,{zIndex:0});shape('receipt-border-bottom',16,height-24,width-32,12,ink,{zIndex:0});}
    text('receipt-logo',spec.mode==='receiptPhotoHeader'?'{{business.name}}':'✳ '+spec.short,25,40,width-50,65,thermal?28:38,{align:'center',fontFamily:'serif'});
    if(spec.mode==='receiptPhotoHeader')photo(0,30,125,width-60,360,{fill:paper});
    text('receipt-title',spec.mode==='receiptOrder'?'ORDER SUMMARY':'A LITTLE KEEPSAKE',25,spec.mode==='receiptPhotoHeader'?510:120,width-50,45,thermal?18:26,{align:'center'});
    text('receipt-rule','- - - - - - - - - - - - - - - - - - - -',25,spec.mode==='receiptPhotoHeader'?570:170,width-50,35,thermal?13:20,{align:'center'});
    if(spec.mode==='receiptDoublePhoto'){photo(0,30,230,width/2-40,300);photo(1,width/2+10,230,width/2-40,300);}
    else if(spec.mode!=='receiptPhotoHeader')photo(0,30,225,width-60, spec.mode==='receiptMinimal'?400:500,{fill:paper});
    text('receipt-event','{{event.name}}',25,760,width-50,60,thermal?22:32,{align:'center'});text('receipt-names','{{event.coupleNames}}',25,820,width-50,65,thermal?25:36,{align:'center',fontFamily:'serif'});
    text('receipt-date','{{event.date}}  ·  {{event.venue}}',25,900,width-50,55,thermal?16:23,{align:'center'});
    text('receipt-foot','THANK YOU FOR CELEBRATING WITH US',25,1010,width-50,45,thermal?16:23,{align:'center'});text('qr-placeholder','{{session.qrCode}}',Math.round(width/2-50),1090,100,100,14,{align:'center'});text('qr-label','SCAN TO DOWNLOAD YOUR PHOTOS',25,1200,width-50,40,thermal?14:18,{align:'center'});
    text('receipt-end','✦  '+spec.short+'  ✦',25,1310,width-50,40,thermal?14:20,{align:'center',color:accent});
  } else if(spec.category==='Newspaper'){
    shape('masthead',20,20,width-40,145,ink);text('masthead-name',spec.short.toUpperCase(),40,35,width-80,72,thermal?28:42,{color:paper,align:'center',fontFamily:'serif'});text('edition','SPECIAL EVENT EDITION · {{event.date}}',35,108,width-70,35,thermal?12:18,{color:paper,align:'center'});
    text('headline',spec.mode==='newsBreaking'?'BREAKING: THEY SAID “I DO”':'THE LOVE STORY OF {{event.coupleNames}}',35,190,width-70,145,thermal?27:51,{fontFamily:'serif',align:'center'});
    if(spec.mode==='comicPanels'){photo(0,30,370,width/2-45,400);photo(1,width/2+15,370,width/2-45,400);text('caption-one','“YES!”',35,790,width/2-60,65,thermal?20:30,{align:'center'});text('caption-two','BEST DAY EVER',width/2+20,790,width/2-60,65,thermal?16:25,{align:'center'});}
    else photo(0,35,370,width-70,680,{fill:paper});
    text('story','A celebration at {{event.venue}} brought family and friends together for a day to remember.',35,1080,width-70,175,thermal?18:29,{fontFamily:'serif'});
    text('footer','EXTRA! EXTRA! KEEP THIS MOMENT FOREVER',35,1300,width-70,75,thermal?15:22,{align:'center',color:accent});
  } else if(spec.category==='Korean'){
    shape('strip-header',0,0,width,130,ink);text('strip-brand',spec.short+' · 네컷',25,30,width-50,70,thermal?24:38,{color:paper,align:'center'});
    if(spec.styleIndex===5){const gap=thermal?12:22,margin=thermal?16:28,cellW=(width-2*margin-gap)/2,cellH=(height*.60-gap)/2;for(let i=0;i<count;i++){const left=margin+(i%2)*(cellW+gap),top=height*.16+Math.floor(i/2)*(cellH+gap);shape(`frame-${i}`,left,top,cellW,cellH,thermal?'#111111':accent);photo(i,left+8,top+8,cellW-16,cellH-16,{fill:paper});}text('strip-caption','{{event.coupleNames}}  ·  {{event.date}}',20,height*.82,width-40,50,thermal?15:23,{align:'center'});}
    else{const margin=20+(spec.styleIndex%4)*7,gap=14+spec.styleIndex*2,top=150+spec.styleIndex*4,bottom=1350-spec.styleIndex*3,frameH=(bottom-top-gap*(count-1))/count;for(let i=0;i<count;i++){shape(`frame-${i}`,margin,top+i*(frameH+gap),width-2*margin,frameH,thermal?'#111111':accent);photo(i,margin+10,top+10+i*(frameH+gap),width-2*margin-20,frameH-20,{fill:paper});}text('strip-caption','{{event.coupleNames}}  ·  {{event.date}}',20,1420+spec.styleIndex*2,width-40,50,thermal?15:23,{align:'center'});}
  } else if(spec.category==='Photography'){
    if(spec.mode==='photoGrid'){for(let i=0;i<4;i++)photo(i,30+(i%2)*(width/2),170+Math.floor(i/2)*570,width/2-45,530,{fill:paper});}
    else if(count>1){const gap=18,top=175,frameH=Math.floor((1170-gap*(count-1))/count);for(let i=0;i<count;i++){shape(`frame-${i}`,25,top+i*(frameH+gap),width-50,frameH,thermal?'#111111':accent);photo(i,36,top+11+i*(frameH+gap),width-72,frameH-22,{fill:paper});}}
    else {shape('photo-frame',35,175,width-70,1120,thermal?'#111111':paper);photo(0,55,195,width-110,1080,{fill:paper});}
    text('photo-label',spec.short.toUpperCase(),25,1390,width-50,65,thermal?20:32,{align:'center',fontFamily:'serif'});text('photo-date','{{event.date}} · {{business.name}}',25,1470,width-50,48,thermal?14:21,{align:'center'});
  } else if(spec.category==='Wedding'){
    shape('wedding-top',0,0,width,thermal?155:220,ink);text('wedding-label','TOGETHER WITH LOVE',30,35,width-60,48,thermal?15:21,{color:paper,align:'center'});text('wedding-title',spec.short,30,88,width-60,90,thermal?27:44,{color:paper,align:'center',fontFamily:'serif'});
    if(spec.mode==='weddingDiptych'){photo(0,35,260,width/2-50,730);photo(1,width/2+15,260,width/2-50,730);}
    else photo(0,35,260,width-70,780,{fill:paper});
    text('couple','{{event.coupleNames}}',30,1080,width-60,90,thermal?28:52,{align:'center',fontFamily:'serif',color:accent});
    text('wedding-date','{{event.date}}  ·  {{event.venue}}',30,1190,width-60,55,thermal?17:24,{align:'center'});
    text('wedding-foot','A DAY TO REMEMBER · {{business.name}}',30,1320,width-60,70,thermal?15:22,{align:'center'});
    text('qr-placeholder','{{session.qrCode}}',Math.round(width/2-42),1420,84,84,12,{align:'center'});
  } else if(spec.category==='Creative'){
    const style=spec.mode;
    if(style==='creativeMusic'){
      shape('player-card',25,150,width-50,1020,ink);photo(0,65,220,width-130,680);text('song','♥  '+spec.short.toUpperCase(),65,940,width-130,60,thermal?17:30,{color:paper,align:'center'});text('artist','{{event.coupleNames}}',65,1010,width-130,65,thermal?18:28,{color:paper,align:'center'});
    } else if(style==='creativeSocial'){
      text('social-handle','@{{business.name}}',30,40,width-60,60,thermal?18:29);photo(0,30,125,width-60,850);text('social-reaction','♥  ✦  #{{event.name}}',30,1010,width-60,75,thermal?18:28);text('social-caption','{{event.coupleNames}} · {{event.date}}',30,1100,width-60,110,thermal?17:25);
    } else if(style==='creativeChat'){
      text('chat-title','TODAY ✦ {{event.date}}',30,45,width-60,60,thermal?16:24,{align:'center'});photo(0,45,160,width-90,670);shape('bubble',55,880,width-110,200,thermal?'#eeeeee':accent);text('chat-message','“This is our favorite memory.”',75,925,width-150,110,thermal?19:30,{color:thermal?'#111111':paper,align:'center'});text('chat-sender','{{event.coupleNames}}',30,1130,width-60,65,thermal?16:23,{align:'right'});
    } else if(style==='creativePostcard'){
      photo(0,30,30,width-60,790);shape('postcard-rule',width/2,900,4,550,ink);text('postcard-stamp','✉',width-190,920,140,135,thermal?36:60,{align:'center',color:accent});text('postcard-message','GREETINGS FROM\n{{event.venue}}',40,950,width/2-70,230,thermal?23:35,{fontFamily:'serif'});text('postcard-to','{{event.coupleNames}} · {{event.date}}',40,1240,width-80,100,thermal?17:25);
    } else if(style==='creativeScrapbook'){
      shape('scrap-paper',20,70,width-40,1220,thermal?'#ffffff':paper);photo(0,65,150,width-130,690,{rotation:-2});text('scrap-title','♥ '+spec.short,70,900,width-140,85,thermal?22:38,{fontFamily:'serif'});text('scrap-note','{{event.coupleNames}}\n{{event.date}} · {{event.venue}}',70,1010,width-140,170,thermal?17:26,{fontFamily:'serif'});
    } else if(style==='creativeCard'){
      shape('playing-card',35,80,width-70,1250,thermal?'#ffffff':paper);text('card-corner','A ♥',60,110,140,110,thermal?24:44,{color:accent});photo(0,90,300,width-180,700);text('card-names','{{event.coupleNames}}',60,1060,width-120,80,thermal?22:36,{fontFamily:'serif',align:'center'});text('card-bottom','♥  '+spec.short,60,1170,width-120,70,thermal?18:29,{align:'center'});
    } else if(style==='creativeArcade'){
      shape('arcade-screen',24,90,width-48,1190,ink);text('arcade-top','★ '+spec.short.toUpperCase()+' ★',45,125,width-90,75,thermal?20:34,{color:paper,align:'center'});photo(0,60,260,width-120,640);text('arcade-score','PLAYER 1: {{event.coupleNames}}',50,960,width-100,70,thermal?16:24,{color:paper,align:'center'});text('arcade-cta','PRESS START · KEEP THIS MEMORY',50,1060,width-100,90,thermal?16:23,{color:accent,align:'center'});
    } else {shape('album-cover',20,50,width-40,1280,ink);photo(0,65,110,width-130,790);text('album-title',spec.short,55,950,width-110,100,thermal?24:42,{color:paper,align:'center',fontFamily:'serif'});text('album-names','{{event.coupleNames}}',55,1080,width-110,70,thermal?18:29,{color:paper,align:'center'});text('album-date','{{event.date}} · {{event.venue}}',55,1170,width-110,55,thermal?14:20,{color:paper,align:'center'});}
    text('creative-footer','SCAN FOR DIGITAL COPIES',25,1420,width-50,48,thermal?14:20,{align:'center'});text('qr-placeholder','{{session.qrCode}}',Math.round(width/2-40),1480,80,80,12,{align:'center'});
  }
  const photos=elems.filter(el=>el.type==='photo');
  const style=spec.styleIndex;
  if(photos.length===1&&spec.category==='Boarding Pass'){
    const boxes=horizontal?[[.04,.21,.34,.34],[.06,.23,.31,.32],[.05,.22,.35,.35],[.08,.20,.29,.36],[.03,.24,.36,.31],[.07,.21,.32,.35],[.05,.23,.34,.33],[.04,.20,.30,.36],[.08,.24,.29,.31],[.06,.22,.33,.35],[.03,.21,.36,.34],[.07,.23,.30,.32]]:[[.06,.12,.88,.13],[.08,.11,.84,.14],[.05,.13,.90,.12],[.10,.12,.80,.14],[.07,.11,.86,.15],[.09,.13,.82,.12],[.05,.11,.90,.14],[.08,.12,.84,.13],[.06,.11,.88,.15],[.10,.13,.80,.12],[.04,.12,.92,.13],[.07,.11,.86,.14]];
    const b=boxes[style%boxes.length];photos[0].x=Math.round(width*b[0]);photos[0].y=Math.round(height*b[1]);photos[0].width=Math.round(width*b[2]);photos[0].height=Math.round(height*b[3]);
  }
  if(photos.length===1&&spec.category==='Receipt'&&spec.mode!=='receiptPhotoHeader'){
    const boxes=[[.08,.13,.84,.25],[.12,.14,.76,.23],[.06,.15,.88,.22],[.10,.12,.80,.26],[.15,.14,.70,.24],[.07,.13,.86,.25],[.11,.15,.78,.22],[.05,.14,.90,.24]],b=boxes[style%boxes.length];photos[0].x=Math.round(width*b[0]);photos[0].y=Math.round(height*b[1]);photos[0].width=Math.round(width*b[2]);photos[0].height=Math.round(height*b[3]);
  }
  if(photos.length===1&&spec.category==='Newspaper'){
    const boxes=[[.08,.20,.84,.35],[.12,.21,.76,.32],[.06,.22,.88,.33],[.15,.19,.70,.36],[.08,.23,.84,.31],[.10,.20,.80,.35],[.06,.21,.88,.34],[.14,.22,.72,.32]],b=boxes[style%boxes.length];photos[0].x=Math.round(width*b[0]);photos[0].y=Math.round(height*b[1]);photos[0].width=Math.round(width*b[2]);photos[0].height=Math.round(height*b[3]);
  }
  if(photos.length===1&&spec.category==='Wedding'){
    const boxes=[[.07,.16,.86,.39],[.10,.19,.80,.33],[.05,.22,.90,.34],[.13,.17,.74,.40],[.08,.21,.84,.34],[.17,.16,.66,.40],[.05,.20,.90,.36],[.12,.23,.76,.32],[.09,.17,.82,.39],[.20,.22,.60,.34]],b=boxes[style%boxes.length];photos[0].x=Math.round(width*b[0]);photos[0].y=Math.round(height*b[1]);photos[0].width=Math.round(width*b[2]);photos[0].height=Math.round(height*b[3]);
  }
  if(photos.length===1&&spec.category==='Photography'){
    const boxes=[[.12,.10,.76,.55],[.08,.12,.84,.51],[.15,.13,.70,.48],[.05,.12,.90,.52],[.17,.11,.66,.54],[.10,.14,.80,.48],[.06,.10,.88,.56],[.18,.14,.64,.48]],b=boxes[style%boxes.length];photos[0].x=Math.round(width*b[0]);photos[0].y=Math.round(height*b[1]);photos[0].width=Math.round(width*b[2]);photos[0].height=Math.round(height*b[3]);
  }
  if(!thermal){shape('accent-corner',0,height-34,width,34,accent,{zIndex:0});}
  const metadata={category:spec.category,free:true,builtIn:true,requiredPhotoCount:count,supportedPaperFormats:['color','thermal58','thermal80'],digitalOutputs:['digital-copy.png','receipt-copy.png','animated-copy.gif','original-photo-01.jpg','thumbnail.png'],dynamicVariables:['event.name','event.coupleNames','event.date','event.venue','event.startTime','event.logo','event.reference','business.name','business.logo','session.captureDate','session.captureTime','session.qrCode'],gif:{enabled:true,animatePhotoLayerOnly:true,preserveStaticLayers:true},compatibility:{schemaVersion:'1.0',requiredElements:['photo','text','shape'],minimumMobileAppVersion:null,requiresQrVariable:true}};
  return {schemaVersion:'1.0',templateVersion:1,orientation:'portrait',printSettings:{printOrientation:'auto',thermalRotation:'clockwise',printableWidths:{thermal58:384,thermal80:576},digitalReceiptOrientation:'original'},outputFormat:format==='color'?(horizontal?'ticket-6x4':'2x6'):(format==='thermal58'?'thermal-58mm':'thermal-80mm'),width,height,background:bg,elements:elems,metadata};
}
const templates=[];
let index=0;
for(const [category,group,names] of groups){
  for(let i=0;i<names.length;i++){
    const palette=palettes[index%palettes.length];
    const mode=modes[group][i%modes[group].length];
    const design={category,mode,landscapeMode:mode,orientation:category==='Boarding Pass'?'landscape':'portrait',styleIndex:i,short:names[i].replace(/ Boarding Pass| Ticket| Wedding| Receipt| Newspaper| Photo Strip| Four Cut| Album/g,'').toUpperCase(),palette};
    const item={id:`free-${safeId(names[i])}`,name:names[i],category,description:`Original ${category.toLowerCase()} keepsake layout with editable photo, event, and gallery elements.`,mode,short:design.short,palette,template:layout(design,'color'),variants:{color:layout(design,'color'),thermal58:layout(design,'thermal58'),thermal80:layout(design,'thermal80')}};
    templates.push(item);index++;
  }
}
for(let i=0;i<landscapeAdditions.length;i++){
  const [name,category,landscapeMode]=landscapeAdditions[i];
  const palette=name==='Classic Black-and-White Boarding Pass'?['#ffffff','#111111','#444444','#ffffff']:name==='Luxury Gold Boarding Pass'?['#f7f0dc','#2b2418','#c4a35a','#fffdf6']:palettes[(index+i)%palettes.length];
  const design={name,category,landscapeMode,orientation:'landscape',mode:landscapeMode,styleIndex:category==='Boarding Pass'?12+i:index+i,short:name.replace(/ Boarding Pass| Ticket| Wedding| Newspaper| Headline| Photo Collage/g,'').toUpperCase(),palette};
  const template=layout(design,'color');
  templates.push({id:`free-${safeId(name)}`,name,category,description:`Original editable landscape ${category.toLowerCase()} keepsake with automatic thermal rotation settings.`,mode:landscapeMode,short:design.short,palette,template,variants:{color:template,thermal58:layout(design,'thermal58'),thermal80:layout(design,'thermal80')}});
}
await writeFile(path.join(root,'shared/template-schema/free-templates.json'),JSON.stringify({schemaVersion:'1.0',catalogVersion:2,templates},null,2)+'\n');
console.log(`Generated ${templates.length} original free templates with three format layouts each.`);
