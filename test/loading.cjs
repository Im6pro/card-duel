const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/..';
async function boot(responses){
 let now=0,calls=0,start,online;
 const nodes=new Map(['boot-screen','boot-message','boot-retry'].map(id=>[id,{hidden:false,setAttribute(){},addEventListener(n,f){this[n]=f}}]));
 let loading=true;
 const sandbox={navigator:{onLine:true},AbortController,Date:{now:()=>now},window:{addEventListener:(n,f)=>{online=f}},document:{addEventListener:(n,f)=>{start=f},getElementById:id=>nodes.get(id),body:{classList:{remove(){loading=false}}}},setTimeout(f,ms){if(ms===2500){now+=ms;queueMicrotask(f)}return 1},clearTimeout(){},fetch:async()=>{calls++;const r=responses.shift();if(!r)throw Error('offline');return r}};
 vm.runInNewContext(fs.readFileSync(root+'/web/loading.js','utf8'),sandbox);
 let ready=false;sandbox.gameReady.then(()=>{ready=true});
 assert.equal(ready,false);start();
 for(let i=0;i<400;i++)await Promise.resolve();
 return{sandbox,nodes,calls,loading,ready,online};
}
(async()=>{
 const json={ok:true,headers:{get:()=> 'application/json'},json:async()=>({ready:true,game:'king-slayer'})};
 let b=await boot([{ok:true,headers:{get:()=> 'text/html'}},json]);
 assert.equal(b.calls,2);assert.equal(b.ready,true);assert.equal(b.loading,false);assert.equal(b.nodes.get('boot-screen').hidden,true);
 b=await boot([]);assert.equal(b.ready,false);assert.equal(b.loading,true);assert.equal(b.nodes.get('boot-retry').hidden,false);assert(b.calls<60);
 let handler;vm.runInNewContext(fs.readFileSync(root+'/server.js','utf8'),{require:n=>n==='http'?{createServer:f=>(handler=f,{listen(){}})}:require(n),process:{env:{}},__dirname:root,URL,setTimeout(){}});
 async function request(url,method,origin){let status,body,headers={};await handler({url,method,headers:{origin},async *[Symbol.asyncIterator](){}},{setHeader:(k,v)=>{headers[k]=v},writeHead:(s,h)=>{status=s;Object.assign(headers,h)},end:s=>{body=s}});return{status,body,headers}}
 const allowed='https://king-slayer-play.onrender.com';
 let r=await request('/api/health','GET',allowed);assert.equal(r.status,200);assert.equal(JSON.parse(r.body).ready,true);assert.equal(r.headers['Access-Control-Allow-Origin'],allowed);
 r=await request('/api/health','GET','https://other.example');assert(!r.headers['Access-Control-Allow-Origin']);
 assert.equal((await request('/api/action','OPTIONS',allowed)).status,204);
 assert.equal((await request('/api/action','OPTIONS','https://other.example')).status,403);
 console.log('PASS boot waits for JSON health, retries HTML/errors, timeout remains recoverable; CORS allows only game frontend');
})().catch(e=>{console.error(e);process.exitCode=1});
