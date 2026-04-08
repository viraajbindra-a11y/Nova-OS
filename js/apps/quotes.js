// Astrion OS — Daily Quotes
import { processManager } from '../kernel/process-manager.js';
export function registerQuotes() {
  processManager.register('quotes', { name: 'Quotes', icon: '\uD83D\uDCAC', singleInstance: true, width: 480, height: 380,
    launch: (el) => {
      const Q=[
        {q:"The only way to do great work is to love what you do.",a:"Steve Jobs"},
        {q:"Innovation distinguishes between a leader and a follower.",a:"Steve Jobs"},
        {q:"Stay hungry, stay foolish.",a:"Steve Jobs"},
        {q:"The future belongs to those who believe in the beauty of their dreams.",a:"Eleanor Roosevelt"},
        {q:"It does not matter how slowly you go as long as you do not stop.",a:"Confucius"},
        {q:"Everything you've ever wanted is on the other side of fear.",a:"George Addair"},
        {q:"The best time to plant a tree was 20 years ago. The second best time is now.",a:"Chinese Proverb"},
        {q:"Your time is limited, don't waste it living someone else's life.",a:"Steve Jobs"},
        {q:"The only impossible journey is the one you never begin.",a:"Tony Robbins"},
        {q:"Success is not final, failure is not fatal: it is the courage to continue that counts.",a:"Winston Churchill"},
        {q:"Believe you can and you're halfway there.",a:"Theodore Roosevelt"},
        {q:"In the middle of difficulty lies opportunity.",a:"Albert Einstein"},
        {q:"Code is like humor. When you have to explain it, it's bad.",a:"Cory House"},
        {q:"First, solve the problem. Then, write the code.",a:"John Johnson"},
        {q:"The best error message is the one that never shows up.",a:"Thomas Fuchs"},
      ];
      let idx=Math.floor(Math.random()*Q.length);
      function render(){const q=Q[idx];
        el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:var(--font);color:white;background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px;text-align:center;">
          <div style="font-size:22px;font-weight:300;line-height:1.6;max-width:380px;margin-bottom:20px;">"${q.q}"</div>
          <div style="font-size:13px;color:var(--accent);font-weight:500;">\u2014 ${q.a}</div>
          <button id="qt-next" style="margin-top:28px;padding:10px 24px;border-radius:10px;border:none;background:rgba(255,255,255,0.08);color:white;font-size:12px;cursor:pointer;font-family:var(--font);">Next Quote</button>
        </div>`;
        el.querySelector('#qt-next').onclick=()=>{idx=(idx+1)%Q.length;render();};
      }render();
    }
  });
}
