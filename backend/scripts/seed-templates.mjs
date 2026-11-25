import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(path.resolve(backendRoot,'../shared/template-schema/free-templates.json'),'utf8'));
const quote=value=>value==null?'NULL':`'${String(value).replaceAll("'","''")}'`;
const statements=[];
for(const item of catalog.templates){
  const metadata={...item.template.metadata,mode:item.mode,source:'snapkiosk-free-catalog-v2'};
  const metadataJson=JSON.stringify(metadata),templateJson=JSON.stringify({...item.template,variants:item.variants}),id=quote(item.id);
  statements.push(`INSERT OR IGNORE INTO photo_templates(id,name,description,output_format,status,created_by,category,built_in,free_available,required_photo_count,metadata_json) VALUES(${[item.id,item.name,item.description,item.template.outputFormat,'published',null,item.category,1,1,item.template.metadata.requiredPhotoCount,JSON.stringify(metadata)].map(quote).join(',')});`);
  statements.push(`UPDATE photo_templates SET category=${quote(item.category)},free_available=1,required_photo_count=${item.template.metadata.requiredPhotoCount},metadata_json=${quote(metadataJson)} WHERE id=${id} AND built_in=1;`);
  statements.push(`INSERT OR IGNORE INTO template_versions(id,template_id,version,schema_version,template_json,created_by) SELECT ${id}||'-v'||(COALESCE((SELECT MAX(version) FROM template_versions WHERE template_id=${id}),0)+1),${id},COALESCE((SELECT MAX(version) FROM template_versions WHERE template_id=${id}),0)+1,${quote(catalog.schemaVersion)},${quote(templateJson)},NULL WHERE NOT EXISTS(SELECT 1 FROM template_versions WHERE template_id=${id} AND template_json=${quote(templateJson)});`);
}
const temp=await mkdtemp(path.join(tmpdir(),'snapkiosk-template-seed-'));
const sqlFile=path.join(temp,'free-templates.sql');
const sql=statements.join('\n')+'\n';
await writeFile(sqlFile,sql);
if(process.argv.includes('--dry-run')){process.stdout.write(sql);await rm(temp,{recursive:true,force:true});process.exit(0);}
const remote=process.argv.includes('--remote');
const args=['wrangler','d1','execute','snapkiosk-db',remote?'--remote':'--local','--file',sqlFile];
const result=spawnSync('npx',args,{cwd:backendRoot,stdio:'inherit'});
await rm(temp,{recursive:true,force:true});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
console.log(`Seeded ${catalog.templates.length} built-in templates (${catalog.templates.length*3} variants).`);
