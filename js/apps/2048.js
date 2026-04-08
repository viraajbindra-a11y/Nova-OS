// Astrion OS — 2048 Game
import { processManager } from '../kernel/process-manager.js';
export function register2048() {
  processManager.register('2048', { name: '2048', icon: '\uD83C\uDFB2', singleInstance: true, width: 420, height: 500,
    launch: (el) => {
      let grid=Array(4).fill(null).map(()=>Array(4).fill(0)),score=0;
      const COLORS={0:'#2a2a3a',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
      const TCOLORS={0:'transparent',2:'#776e65',4:'#776e65',8:'#f9f6f2',16:'#f9f6f2',32:'#f9f6f2',64:'#f9f6f2',128:'#f9f6f2',256:'#f9f6f2',512:'#f9f6f2',1024:'#f9f6f2',2048:'#f9f6f2'};
      function addTile(){const empty=[];grid.forEach((r,i)=>r.forEach((c,j)=>{if(!c)empty.push([i,j]);}));if(empty.length){const[r,c]=empty[Math.floor(Math.random()*empty.length)];grid[r][c]=Math.random()<0.9?2:4;}}
      function slide(row){let a=row.filter(x=>x),i=0;while(i<a.length-1){if(a[i]===a[i+1]){a[i]*=2;score+=a[i];a.splice(i+1,1);}i++;}while(a.length<4)a.push(0);return a;}
      function move(dir){let moved=false;if(dir==='left')grid=grid.map(r=>{const n=slide(r);if(n.join()!==r.join())moved=true;return n;});
        else if(dir==='right')grid=grid.map(r=>{const n=slide([...r].reverse()).reverse();if(n.join()!==r.join())moved=true;return n;});
        else if(dir==='up'){for(let c=0;c<4;c++){let col=grid.map(r=>r[c]);const n=slide(col);if(n.join()!==col.join())moved=true;n.forEach((v,r)=>grid[r][c]=v);}}
        else if(dir==='down'){for(let c=0;c<4;c++){let col=grid.map(r=>r[c]).reverse();const n=slide(col).reverse();const orig=grid.map(r=>r[c]);if(n.join()!==orig.join())moved=true;n.forEach((v,r)=>grid[r][c]=v);}}
        if(moved)addTile();render();}
      function render(){
        el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;height:100%;background:#1a1a22;padding:16px;font-family:var(--font);color:white;">
          <div style="display:flex;justify-content:space-between;width:100%;margin-bottom:12px;padding:0 20px;"><span style="font-size:18px;font-weight:700;">2048</span><span style="font-size:14px;">Score: ${score}</span></div>
          <div style="display:grid;grid-template-columns:repeat(4,80px);gap:6px;background:#1e1e2e;padding:8px;border-radius:10px;">
            ${grid.flat().map(v=>`<div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;background:${COLORS[v]||'#3c3a32'};color:${TCOLORS[v]||'#f9f6f2'};font-size:${v>=1024?'20px':v>=100?'24px':'28px'};font-weight:700;border-radius:6px;">${v||''}</div>`).join('')}
          </div>
          <div style="margin-top:12px;"><button id="g-reset" style="padding:8px 20px;border-radius:8px;border:none;background:rgba(255,255,255,0.08);color:white;font-size:12px;cursor:pointer;font-family:var(--font);">New Game</button></div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">Arrow keys to play</div>
        </div>`;
        el.querySelector('#g-reset').onclick=()=>{grid=Array(4).fill(null).map(()=>Array(4).fill(0));score=0;addTile();addTile();render();};}
      document.addEventListener('keydown',(e)=>{if(!el.isConnected)return;
        if(e.key==='ArrowLeft')move('left');else if(e.key==='ArrowRight')move('right');
        else if(e.key==='ArrowUp'){e.preventDefault();move('up');}else if(e.key==='ArrowDown'){e.preventDefault();move('down');}});
      addTile();addTile();render();
    }
  });
}
