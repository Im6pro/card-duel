const http=require('http'),crypto=require('crypto');const rooms=new Map(),S=['♠','♥','♦','♣'];const ranks='A 2 3 4 5 6 7 8 9 10 J Q K'.split(' ');function deck(){let d=S.flatMap(s=>ranks.map((r,i)=>({s,r,n:i+1,id:crypto.randomUUID()})));for(let i=d.length-1;i>0;i--){let j=crypto.randomInt(i+1);[d[i],d[j]]=[d[j],d[i]]}return d}const color=c=>'♥♦'.includes(c.s)?1:0;function start(g){g.botTurnState=null;let d=[deck(),deck()];g.table=[...d[0].splice(0,4),...d[1].splice(0,4)].map(c=>[c]);g.found=Array.from({length:8},()=>[]);g.p=d.map((a,i)=>({name:g.players[i].name,right:a.splice(0,13),left:a,fire:[],drawn:null}));g.scores=[0,1].map(i=>g.table.slice(i*4,i*4+4).reduce((a,c)=>a+Math.min(10,c.at(-1).n),0));g.turn=g.scores[0]>=g.scores[1]?0:1;g.openFire=false;g.winner=null;g.started=true;g.log='بدأت اللعبة'}function botPlay(g){if(!g.bot||!g.started||g.winner!==null||g.turn!==1)return;let p=g.p[1];for(let steps=0;steps<150&&g.turn===1&&g.winner===null;steps++){let moved=false;let sources=['right',...g.table.map((x,j)=>x.length?'t'+j:null).filter(Boolean),...(g.openFire?['fire']:[])];for(let f of sources){let c=f==='right'?p.right.at(-1):f==='fire'?p.fire.at(-1):g.table[+f.slice(1)]?.at(-1);if(!c)continue;let targets=[...g.found.map((x,j)=>({id:'f'+j,top:x.at(-1)})),...g.table.map((x,j)=>({id:'t'+j,top:x.at(-1)}))];for(let t of targets){if(f===t.id)continue;let ok=t.id[0]==='f'?(t.top?t.top.s===c.s&&c.n===t.top.n+1:c.n===1):(!t.top||t.top.n===c.n+1&&color(t.top)!==color(c));if(ok){act(g,1,{type:'move',from:f,to:t.id});moved=true;break}}if(moved)break}if(moved)continue;if(!p.drawn){try{act(g,1,{type:'draw'})}catch{g.turn=0;g.openFire=false;break}let c=p.drawn;let targets=[...g.found.map((x,j)=>({id:'f'+j,top:x.at(-1)})),...g.table.map((x,j)=>({id:'t'+j,top:x.at(-1)}))];let t=targets.find(t=>t.id[0]==='f'?(t.top?t.top.s===c.s&&c.n===t.top.n+1:c.n===1):(!t.top||t.top.n===c.n+1&&color(t.top)!==color(c)));if(t){act(g,1,{type:'move',from:'drawn',to:t.id});continue}}act(g,1,{type:'discard'});break}if(g.turn===1){g.turn=0;g.openFire=false}}
function botStep(g) {
  if (!g.bot || !g.started || g.winner !== null || g.turn !== 1) return;
  const p = g.p[1], difficulty = g.botDifficulty || 'medium';
  const memory = g.botTurnState || (g.botTurnState = { moved: new Set(), rearrangements: 0 });
  // Resolve the drawn card first; fire cannot be played while it is pending.
  const sources = p.drawn ? ['drawn'] : [
    'right', ...g.table.map((pile, j) => pile.length ? 't' + j : null).filter(Boolean),
    ...(g.openFire ? ['fire'] : [])
  ];
  const options = [];
  for (const from of sources) {
    const card = from === 'right' ? p.right.at(-1) : from === 'fire' ? p.fire.at(-1)
      : from === 'drawn' ? p.drawn : g.table[Number(from.slice(1))]?.at(-1);
    if (!card) continue;
    for (const to of [...g.found.map((_, j) => 'f' + j), ...g.table.map((_, j) => 't' + j)]) {
      if (from === to) continue;
      const foundation = to[0] === 'f';
      const top = (foundation ? g.found : g.table)[Number(to.slice(1))].at(-1);
      const rearranging = from[0] === 't' && !foundation;
      // A card may be rearranged only once this turn, but can still go to a foundation.
      if (rearranging && (memory.moved.has(card.id) || memory.rearrangements >= g.table.length
          || (!top && g.table[Number(from.slice(1))].length === 1))) continue;
      const legal = foundation
        ? (top ? top.s === card.s && card.n === top.n + 1 : card.n === 1)
        : (!top || top.n === card.n + 1 && color(top) !== color(card)
          || top.s === card.s && card.n === top.n + 1);
      if (!legal) continue;
      const score = (foundation ? 35 : 6)
        + (from === 'right' ? 32 : from === 'drawn' ? 22 : from === 'fire' ? 18
          : g.table[Number(from.slice(1))].length > 1 ? 9 : 3)
        + (foundation ? card.n : 0) + (top ? 0 : 4);
      options.push({ from, to, score, cardId: card.id, rearranging });
    }
  }
  if (options.length) {
    if (difficulty === 'easy') options.sort(() => Math.random() - .5);
    else options.sort((a, b) => b.score - a.score + (Math.random() - .5) * (difficulty === 'hard' ? 2 : 14));
    const move = options[0];
    act(g, 1, { type: 'move', from: move.from, to: move.to });
    if (move.rearranging) {
      memory.moved.add(move.cardId);
      memory.rearrangements++;
    } else {
      // Playing a personal card or advancing a foundation is actual progress.
      memory.rearrangements = 0;
    }
    return;
  }
  if (!p.drawn) {
    try { act(g, 1, { type: 'draw' }); return; }
    catch {
      g.turn = 0;
      g.openFire = false;
      g.botTurnState = null;
      g.log = 'دور ' + g.p[0].name;
      return;
    }
  }
  act(g, 1, { type: 'discard' });
}
function scheduleBot(g){if(!g.bot||g.botScheduled||g.turn!==1||g.winner!==null)return;g.botScheduled=true;setTimeout(()=>{g.botScheduled=false;if(g.turn!==1||g.winner!==null)return;try{botStep(g)}catch(e){g.turn=0;g.openFire=false;g.botTurnState=null;g.log='دور '+g.p[0].name}scheduleBot(g)},750)}
function view(g,i){let p=g.p?.[i];return{code:g.code,started:g.started,players:g.players.map(x=>x.name),me:i,turn:g.turn,scores:g.scores,table:g.table,found:g.found?.map(a=>a.at(-1)||null),right:p?.right.at(-1),rightCount:p?.right.length||0,leftCount:p?.left.length||0,fire:p?.fire.at(-1),fireCount:p?.fire.length||0,drawn:p?.drawn,opponent:g.p?{right:g.p[1-i].right.length,left:g.p[1-i].left.length,fire:g.p[1-i].fire.length,fireTop:g.p[1-i].fire.at(-1)||null,drawn:!!g.p[1-i].drawn,name:g.p[1-i].name}:null,openFire:g.openFire,winner:g.winner,botDifficulty:g.botDifficulty||null,log:g.log}}function fail(s){throw Error(s)}function act(g,i,a){if(!g.started)fail('بانتظار اللاعب الثاني');if(a.type==='restart'){if(g.winner===null)fail('اللعبة مستمرة');start(g);scheduleBot(g);return}if(g.turn!==i)fail('مو دورك');if(g.winner!==null)fail('انتهت اللعبة');let p=g.p[i];if(a.type==='move'){let f=a.from,t=a.to,c;if(p.drawn&&f!=='drawn')fail('لازم تركب أو تقط الورقة المسحوبة أول');if(f==='right')c=p.right.at(-1);else if(f==='fire'){if(!g.openFire)fail('العب من اليمين أو اسحب من اليسار أول');if(p.drawn)fail('ركّب أو قط الورقة المسحوبة قبل اللعب من النار');c=p.fire.at(-1)}else if(f==='drawn')c=p.drawn;else if(/^t[0-7]$/.test(f))c=g.table[+f.slice(1)]?.at(-1);else fail('مصدر غير صحيح');if(!c)fail('ماكو ورقة');if(/^t[0-7]$/.test(t)){let top=g.table[+t.slice(1)]?.at(-1);if(f===t||top&&!(top.n===c.n+1&&color(top)!==color(c)||top.s===c.s&&c.n===top.n+1))fail('ترتيب غير صحيح')}else if(/^f[0-7]$/.test(t)){let top=g.found[+t.slice(1)].at(-1);if(top?top.s!==c.s||c.n!==top.n+1:c.n!==1)fail('النص نفس الشكل وتصاعدي')}else fail('مكان غير صحيح');if(f==='right')p.right.pop();else if(f==='fire')p.fire.pop();else if(f==='drawn')p.drawn=null;else g.table[+f.slice(1)].pop();if(t[0]==='t')g.table[+t.slice(1)].push(c);else g.found[+t.slice(1)].push(c);g.openFire=true;g.log=p.name+' ركّب '+c.r+c.s;if(!p.right.length&&!p.left.length&&!p.fire.length&&!p.drawn){g.winner=i;g.log='🏆 '+p.name+' فاز!'}return}if(a.type==='draw'){if(p.drawn)fail('لازم تركب أو تقط الورقة');if(!p.left.length){if(!p.fire.length)fail('ماكو أوراق للسحب');p.left=p.fire.reverse();p.fire=[]}p.drawn=p.left.pop();g.openFire=true;g.log=p.name+' سحب ورقة';return}if(a.type==='discard'){if(!p.drawn)fail('اسحب أول');p.fire.push(p.drawn);p.drawn=null;g.turn=1-i;g.openFire=false;g.botTurnState=null;g.log='دور '+g.p[g.turn].name;return}fail('حركة غير معروفة')}function send(r,n,x){r.writeHead(n,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});r.end(JSON.stringify(x))}const fs=require('fs');http.createServer(async(q,r)=>{try{if(q.method==='GET'&&!q.url.startsWith('/api/')){let pathname=new URL(q.url,'http://localhost').pathname;let assets={'/king-slayer-characters.webp':['king-slayer-characters.webp','image/webp'],'/1026AC6E-94FA-46C3-9487-901BDE9A1770.png':['1026AC6E-94FA-46C3-9487-901BDE9A1770.png','image/png']};let asset=assets[pathname];if(asset){let file=__dirname+'/'+asset[0];if(!fs.existsSync(file)){r.writeHead(404);return r.end('Asset not found')}r.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'public, max-age=300'});return fs.createReadStream(file).pipe(r)}r.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return fs.createReadStream(__dirname+'/index.html').pipe(r)}let b='';for await(let c of q){b+=c;if(b.length>20000)fail('too large')}let a=b?JSON.parse(b):{};if(q.url==='/api/create'){let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));let token=crypto.randomBytes(16).toString('hex');rooms.set(code,{code,players:[{name:String(a.name||'لاعب 1').slice(0,24),token}],started:false});return send(r,200,{code,token})}if(q.url==='/api/test'){let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));let token=crypto.randomBytes(16).toString('hex');let g={code,players:[{name:String(a.name||'محمد').slice(0,24),token},{name:'Bot تجريبي',token:'BOT'}],bot:true,botDifficulty:['easy','medium','hard'].includes(a.difficulty)?a.difficulty:'medium',started:false};rooms.set(code,g);start(g);scheduleBot(g);return send(r,200,{code,token})}if(q.url==='/api/join'){let g=rooms.get(String(a.code||'').toUpperCase());if(!g||g.players.length!==1)fail('الغرفة غير متاحة');let token=crypto.randomBytes(16).toString('hex');g.players.push({name:String(a.name||'لاعب 2').slice(0,24),token});start(g);return send(r,200,{code:g.code,token})}let u=new URL(q.url,'http://localhost'),g=rooms.get(a.code||u.searchParams.get('code'));if(!g)fail('الغرفة غير موجودة');let i=g.players.findIndex(p=>p.token===(a.token||u.searchParams.get('token')));if(i<0)fail('دخول غير مصرح');if(u.pathname==='/api/state')return send(r,200,view(g,i));if(u.pathname==='/api/action'){act(g,i,a);scheduleBot(g);return send(r,200,view(g,i))}send(r,404,{error:'not found'})}catch(e){send(r,400,{error:e.message})}}).listen(process.env.PORT||3000,'0.0.0.0');