import {execFileSync} from 'node:child_process';
import {mkdirSync,copyFileSync,readdirSync} from 'node:fs';
for(const file of ['server.mjs',...readdirSync('src').filter(x=>x.endsWith('.js')).map(x=>'src/'+x)])execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
mkdirSync('dist/src',{recursive:true});
copyFileSync('index.html','dist/index.html');
for(const file of readdirSync('src'))copyFileSync('src/'+file,'dist/src/'+file);
console.log('Frontend modules validated and dist/ generated.');
