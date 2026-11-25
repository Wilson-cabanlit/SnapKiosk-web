import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const catalog=JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)),'free-templates.json'),'utf8'));

test('free catalog contains the complete unique design set',()=>{
  assert.equal(catalog.templates.length,72);
  assert.equal(new Set(catalog.templates.map(item=>item.id)).size,72);
  assert.equal(new Set(catalog.templates.map(item=>item.name)).size,72);
  assert.ok(catalog.templates.filter(item=>item.template.orientation==='landscape').length>=20);
  for(const category of new Set(catalog.templates.map(item=>item.category))){
    const layouts=catalog.templates.filter(item=>item.category===category);
    const geometries=layouts.map(item=>JSON.stringify(item.template.elements.map(({type,x,y,width,height})=>({type,x,y,width,height}))));
    assert.equal(new Set(geometries).size,layouts.length,`${category} includes repeated element geometry`);
  }
});

test('each design has platform schema elements and three paper layouts',()=>{
  for(const item of catalog.templates){
    assert.equal(item.template.schemaVersion,'1.0');
    assert.deepEqual(Object.keys(item.variants).sort(),['color','thermal58','thermal80']);
    for(const layout of [item.template,...Object.values(item.variants)]){
      assert.ok(layout.width>=100&&layout.height>=100);
      assert.ok(layout.elements.length>0&&layout.elements.length<=100);
      assert.ok(layout.elements.every(element=>['photo','text','shape','graphic'].includes(element.type)));
      for(const element of layout.elements){
        assert.ok(element.x>=0&&element.y>=0,`${item.name} ${layout.outputFormat}: ${element.id} starts outside the canvas`);
        assert.ok(element.x+element.width<=layout.width&&element.y+element.height<=layout.height,`${item.name} ${layout.outputFormat}: ${element.id} extends outside the canvas`);
      }
    }
    if(item.template.orientation==='landscape'){
      for(const layout of Object.values(item.variants)){
        assert.equal(layout.orientation,'landscape',`${item.name} must retain its landscape master in every output variant`);
        assert.equal(layout.width,item.template.width);
        assert.equal(layout.height,item.template.height);
      }
      assert.equal(item.template.printSettings.printOrientation,'auto');
      assert.equal(item.template.printSettings.thermalRotation,'clockwise');
    }
    assert.equal(item.template.metadata.free,true);
    assert.ok(item.template.metadata.requiredPhotoCount>=1);
    assert.equal(item.template.metadata.gif.preserveStaticLayers,true);
  }
});

test('landscape boarding pass keeps one master geometry for color and thermal outputs',()=>{
  const item=catalog.templates.find(template=>template.name==='Classic Blue Airline Boarding Pass');
  assert.ok(item);
  assert.equal(item.template.orientation,'landscape');
  assert.deepEqual([item.template.width,item.template.height],[1800,1000]);
  for(const format of ['color','thermal58','thermal80']){
    const layout=format==='color'?item.variants.color:item.variants[format];
    assert.deepEqual([layout.width,layout.height],[1800,1000]);
    assert.equal(layout.orientation,'landscape');
    assert.deepEqual(layout.elements.map(({id,type,x,y,width,height})=>({id,type,x,y,width,height})),item.template.elements.map(({id,type,x,y,width,height})=>({id,type,x,y,width,height})));
  }
  assert.equal(item.variants.thermal58.background,'#ffffff');
  assert.ok(item.variants.thermal58.elements.find(element=>element.id==='qr-placeholder').width===item.variants.thermal58.elements.find(element=>element.id==='qr-placeholder').height);
});

test('photo and text elements do not collide in color or thermal layouts',()=>{
  for(const item of catalog.templates){
    const layouts=[item.template,...Object.values(item.variants)];
    for(const layout of layouts){
      const visible=layout.elements.filter(element=>element.type==='photo'||element.type==='text');
      for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
        const a=visible[i],b=visible[j];
        const overlapWidth=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
        const overlapHeight=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
        const smallerArea=Math.min(a.width*a.height,b.width*b.height);
        assert.ok(overlapWidth*overlapHeight<=smallerArea*.03,`${item.name} ${layout.outputFormat}: ${a.id} overlaps ${b.id}`);
      }
    }
  }
});
