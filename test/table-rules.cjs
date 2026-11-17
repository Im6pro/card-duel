const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const ctx=vm.createContext({require:n=>n==='http'?{createServer:()=>({listen(){}})}:require(n),process:{env:{}},__dirname,URL,setTimeout(){}});
vm.runInContext(server,ctx);
let serial=0,checks=0;
const card=(n,s)=>({n,s,r:String(n),id:String(++serial)});
function game(player=0){return {started:true,turn:player,winner:null,openFire:true,players:[{name:'A'},{name:'B'}],table:Array.from({length:8},()=>[]),found:Array.from({length:8},()=>[]),p:[0,1].map(i=>({name:String(i),right:[card(13,'♠')],left:[card(13,'♥')],fire:[],drawn:null}))};}
const red=s=>s==='♥'||s==='♦';
for(const player of [0,1]) for(const from of ['right','fire','drawn','t0']) for(const suit of ['♠','♣','♥','♦']) for(const topSuit of ['♠','♣','♥','♦']) for(let n=1;n<=13;n++) for(let topN=1;topN<=13;topN++){
 const g=game(player),c=card(n,suit);g.table[7]=[card(topN,topSuit)];
 if(from==='t0')g.table[0]=[c];else if(from==='drawn')g.p[player].drawn=c;else g.p[player][from]=[c];
 const before=JSON.stringify(g),legal=topN-n===1&&red(suit)!==red(topSuit);
 if(legal){ctx.act(g,player,{type:'move',from,to:'t7'});assert.equal(g.table[7].at(-1).id,c.id);}
 else {assert.throws(()=>ctx.act(g,player,{type:'move',from,to:'t7'}),/تنازلي/);assert.equal(JSON.stringify(g),before);}
 checks++;
}
for(const suit of ['♠','♣','♥','♦']){
 const g=game();g.found[0]=[card(3,suit)];g.p[0].fire=[card(4,suit)];
 ctx.act(g,0,{type:'move',from:'fire',to:'f0'});assert.equal(g.found[0].at(-1).n,4);checks++;
}
for(const n of [1,7,13]){const g=game();g.p[0].right=[card(n,'♦')];ctx.act(g,0,{type:'move',from:'right',to:'t0'});assert.equal(g.table[0].at(-1).n,n);checks++;}
const bot=game(1);bot.bot=true;bot.botDifficulty='hard';bot.table=Array.from({length:8},()=>[card(13,'♠')]);bot.table[0]=[card(4,'♠')];bot.p[1].right=[card(5,'♠')];bot.p[1].left=[card(13,'♥')];
ctx.botStep(bot);assert.equal(bot.p[1].right.at(-1).n,5);assert.equal(bot.p[1].drawn.n,13);
ctx.botStep(bot);assert.equal(bot.turn,0);checks++;
console.log('PASS '+checks+' rule cases: alternating descending sides; ascending same-suit foundations; both players and all card sources; bot respects same rule.');
