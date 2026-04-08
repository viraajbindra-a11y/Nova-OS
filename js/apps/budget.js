// Astrion OS — Budget Tracker
import { processManager } from '../kernel/process-manager.js';
const KEY='nova-budget';
export function registerBudget() {
  processManager.register('budget', { name: 'Budget', icon: '\uD83D\uDCB0', singleInstance: true, width: 560, height: 500,
    launch: (el) => {
      function getData(){try{return JSON.parse(localStorage.getItem(KEY))||{entries:[]};}catch{return {entries:[]};}}
      function save(d){localStorage.setItem(KEY,JSON.stringify(d));}
      let data=getData();
      function render(){
        const income=data.entries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
        const expense=data.entries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
        const balance=income-expense;
        el.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;font-family:var(--font);color:white;background:#1a1a22;padding:16px;gap:12px;">
          <div style="font-size:16px;font-weight:600;">Budget Tracker</div>
          <div style="display:flex;gap:8px;">
            <div style="flex:1;background:rgba(52,199,89,0.1);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:10px;color:rgba(255,255,255,0.5);">Income</div><div style="font-size:20px;font-weight:600;color:#34c759;">$${income.toFixed(2)}</div></div>
            <div style="flex:1;background:rgba(255,59,48,0.1);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:10px;color:rgba(255,255,255,0.5);">Expenses</div><div style="font-size:20px;font-weight:600;color:#ff3b30;">$${expense.toFixed(2)}</div></div>
            <div style="flex:1;background:rgba(0,122,255,0.1);border-radius:10px;padding:12px;text-align:center;"><div style="font-size:10px;color:rgba(255,255,255,0.5);">Balance</div><div style="font-size:20px;font-weight:600;color:${balance>=0?'#007aff':'#ff3b30'};">$${balance.toFixed(2)}</div></div>
          </div>
          <div style="display:flex;gap:6px;">
            <input id="b-desc" placeholder="Description" style="flex:2;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:white;font-size:12px;font-family:var(--font);outline:none;">
            <input id="b-amt" type="number" placeholder="$0.00" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:white;font-size:12px;font-family:var(--font);outline:none;">
            <button id="b-inc" style="padding:8px 12px;border-radius:8px;border:none;background:#34c759;color:white;font-size:11px;cursor:pointer;">+</button>
            <button id="b-exp" style="padding:8px 12px;border-radius:8px;border:none;background:#ff3b30;color:white;font-size:11px;cursor:pointer;">-</button>
          </div>
          <div style="flex:1;overflow-y:auto;">${data.entries.slice().reverse().map((e,i)=>`<div style="display:flex;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px;">
            <span style="flex:1;">${e.desc}</span><span style="color:${e.type==='income'?'#34c759':'#ff3b30'};font-weight:500;">${e.type==='income'?'+':'-'}$${e.amount.toFixed(2)}</span>
            <button class="b-del" data-i="${data.entries.length-1-i}" style="background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;margin-left:8px;font-size:14px;">\u00D7</button></div>`).join('')}</div>
        </div>`;
        const add=(type)=>{const desc=el.querySelector('#b-desc').value,amt=parseFloat(el.querySelector('#b-amt').value);if(!desc||!amt)return;data.entries.push({desc,amount:amt,type,date:Date.now()});save(data);render();};
        el.querySelector('#b-inc').onclick=()=>add('income');
        el.querySelector('#b-exp').onclick=()=>add('expense');
        el.querySelectorAll('.b-del').forEach(b=>b.onclick=()=>{data.entries.splice(parseInt(b.dataset.i),1);save(data);render();});
      }render();
    }
  });
}
