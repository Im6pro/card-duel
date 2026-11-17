const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
const same=(actual,expected,message)=>assert.equal(JSON.stringify(actual),JSON.stringify(expected),message);
function setup(){
 const elements=new Map(),events=[];let response;
 const document={hidden:false,addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,{textContent:'',style:{},setAttribute(){}});return elements.get(id)}};
 const ctx=vm.createContext({document,localStorage:{getItem(){return null},setItem(){}},URLSearchParams,location:{search:''},setInterval(){},setTimeout(){},window:{},navigator:{vibrate:n=>events.push(['vibrate',n])},matchMedia:()=>({matches:false})});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const initial={started:true,turn:0,me:0,winner:null,drawn:null,log:'ready'};
 ctx.initial=initial;ctx.events=events;
 vm.runInContext("state=initial;code='test';token='token';render=()=>events.push(['render']);sound=k=>events.push(['sound',k]);notifyTurn=()=>{};showOpponentMove=()=>{}",ctx);
 document.querySelector=()=>({animate:()=>events.push(['animate'])});
 ctx.fetch=async()=>{if(response instanceof Error)throw response;return {ok:true,json:async()=>response}};
 return{ctx,events,elements,document,run:s=>vm.runInContext(s,ctx),respond:value=>{response=value},initial};
}
(async()=>{
 let t=setup();t.respond({...t.initial,drawn:{id:'one'},log:'draw'});
 await t.ctx.action('draw');same(t.events.filter(e=>e[0]==='sound'),[['sound','draw']]);
 await t.ctx.refresh();assert.equal(t.events.filter(e=>e[0]==='sound').length,1,'poll must not replay draw');
 t.events.length=0;t.respond({...t.initial,log:'placed'});await t.ctx.action('move','drawn','t0');
 same(t.events,[['sound','card'],['render'],['vibrate',18],['animate']]);
 t=setup();t.respond(new Error('illegal placement'));await t.ctx.action('move','right','f0');assert.equal(t.events.length,0,'failed move must have no feedback');
 t=setup();t.respond({...t.initial,drawn:{id:'one'}});await Promise.all([t.ctx.action('draw'),t.ctx.action('draw')]);assert.equal(t.events.filter(e=>e[0]==='sound').length,1,'double tap plays once');
 t=setup();t.run('state.drawn={id:"one"}');await t.ctx.action('move','right','t0');assert.equal(t.events.length,0,'blocked action must stay silent');
 t=setup();t.ctx.matchMedia=()=>({matches:true});t.ctx.placementFeedback('t0');same(t.events,[['vibrate',18]],'respect reduced motion');
 t.events.length=0;t.document.hidden=true;t.ctx.placementFeedback('t0');assert.equal(t.events.length,0,'hidden page must not vibrate');
 t=setup();delete t.ctx.navigator.vibrate;t.ctx.placementFeedback('t0');same(t.events,[['animate']],'visual fallback without vibration');
 t=setup();t.ctx.toggleSound();assert.equal(t.run('soundMuted'),true);assert.match(t.elements.get('soundBtn').textContent,/مغلق/);
 console.log('PASS action feedback: successful draw/move, no replay, rejected/locked moves, double tap, reduced motion, hidden page, vibration fallback, mute');
})().catch(e=>{console.error(e);process.exitCode=1});

