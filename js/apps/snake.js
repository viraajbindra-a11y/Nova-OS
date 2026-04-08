// Astrion OS — Snake Game
import { processManager } from '../kernel/process-manager.js';
export function registerSnake() {
  processManager.register('snake', { name: 'Snake', icon: '\uD83D\uDC0D', singleInstance: true, width: 440, height: 500,
    launch: (el) => {
      const W=20,H=20,SZ=20;let snake=[{x:10,y:10}],dir={x:1,y:0},food={x:15,y:10},score=0,alive=true,interval=null;
      const canvas=document.createElement('canvas');canvas.width=W*SZ;canvas.height=H*SZ;canvas.style.cssText='display:block;margin:0 auto;background:#111;border-radius:8px;';
      el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;height:100%;background:#1a1a22;padding:16px;font-family:var(--font);color:white;">
        <div style="display:flex;justify-content:space-between;width:${W*SZ}px;margin-bottom:8px;"><span style="font-size:14px;font-weight:600;">Snake</span><span id="sn-score" style="font-size:14px;">Score: 0</span></div>
        <div id="sn-canvas"></div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">Arrow keys to move. Space to restart.</div>
      </div>`;
      el.querySelector('#sn-canvas').appendChild(canvas);
      const ctx=canvas.getContext('2d');
      function draw(){ctx.fillStyle='#111';ctx.fillRect(0,0,W*SZ,H*SZ);ctx.fillStyle='#ff3b30';ctx.fillRect(food.x*SZ,food.y*SZ,SZ-1,SZ-1);
        snake.forEach((s,i)=>{ctx.fillStyle=i===0?'#34c759':'#2aa84a';ctx.fillRect(s.x*SZ,s.y*SZ,SZ-1,SZ-1);});
        if(!alive){ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W*SZ,H*SZ);ctx.fillStyle='white';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText('Game Over! Space to restart',W*SZ/2,H*SZ/2);}}
      function tick(){if(!alive)return;const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
        if(head.x<0||head.x>=W||head.y<0||head.y>=H||snake.some(s=>s.x===head.x&&s.y===head.y)){alive=false;clearInterval(interval);draw();return;}
        snake.unshift(head);if(head.x===food.x&&head.y===food.y){score++;el.querySelector('#sn-score').textContent='Score: '+score;
          food={x:Math.floor(Math.random()*W),y:Math.floor(Math.random()*H)};}else snake.pop();draw();}
      function reset(){snake=[{x:10,y:10}];dir={x:1,y:0};food={x:15,y:10};score=0;alive=true;el.querySelector('#sn-score').textContent='Score: 0';if(interval)clearInterval(interval);interval=setInterval(tick,120);}
      document.addEventListener('keydown',(e)=>{if(!el.isConnected)return;
        if(e.key==='ArrowUp'&&dir.y!==1)dir={x:0,y:-1};else if(e.key==='ArrowDown'&&dir.y!==-1)dir={x:0,y:1};
        else if(e.key==='ArrowLeft'&&dir.x!==1)dir={x:-1,y:0};else if(e.key==='ArrowRight'&&dir.x!==-1)dir={x:1,y:0};
        else if(e.key===' '&&!alive)reset();});
      reset();
    }
  });
}
