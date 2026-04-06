// Astrion OS — Messages App
// Chat interface with AI assistant + local conversation history.
// Future: Matrix/XMPP integration for real messaging.

import { processManager } from '../kernel/process-manager.js';
import { aiService } from '../kernel/ai-service.js';
import { sounds } from '../kernel/sound.js';

const CONVERSATIONS_KEY = 'nova-messages-conversations';

export function registerMessages() {
  processManager.register('messages', {
    name: 'Messages',
    icon: '\uD83D\uDCAC',
    singleInstance: true,
    width: 820,
    height: 540,
    minWidth: 600,
    minHeight: 400,
    launch: (contentEl) => initMessages(contentEl),
  });
}

function getConversations() {
  try { return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY)) || []; }
  catch { return []; }
}

function saveConversations(convos) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convos));
}

function initMessages(container) {
  let conversations = getConversations();
  let activeConvo = conversations[0]?.id || null;

  // Ensure default AI conversation exists
  if (!conversations.find(c => c.id === 'astrion-ai')) {
    conversations.unshift({
      id: 'astrion-ai',
      name: 'Astrion AI',
      avatar: '\u2728',
      messages: [
        { from: 'them', text: "Hey! I'm Astrion, your AI assistant. Ask me anything — code, homework, ideas, or just chat.", time: Date.now() }
      ],
      isAI: true,
    });
    saveConversations(conversations);
  }

  if (!activeConvo) activeConvo = 'astrion-ai';

  function render() {
    container.innerHTML = `
      <div style="display:flex; height:100%; font-family:var(--font); color:white; background:#1a1a22;">
        <!-- Sidebar -->
        <div style="width:260px; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column;">
          <div style="padding:14px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px; font-weight:600;">Messages</div>
            <button id="msg-new" style="background:rgba(255,255,255,0.08); border:none; color:white; width:26px; height:26px; border-radius:6px; cursor:pointer; font-size:14px;" title="New conversation">+</button>
          </div>
          <div id="msg-list" style="flex:1; overflow-y:auto;"></div>
        </div>

        <!-- Chat area -->
        <div style="flex:1; display:flex; flex-direction:column;">
          <div id="msg-header" style="padding:12px 16px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:10px;"></div>
          <div id="msg-chat" style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:8px;"></div>
          <div style="padding:12px 16px; border-top:1px solid rgba(255,255,255,0.06); display:flex; gap:8px;">
            <input type="text" id="msg-input" placeholder="Type a message..." autocomplete="off" style="
              flex:1; padding:10px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);
              background:rgba(255,255,255,0.06); color:white; font-size:13px; font-family:var(--font); outline:none;
            ">
            <button id="msg-send" style="
              padding:10px 18px; border-radius:20px; border:none; background:var(--accent);
              color:white; font-size:13px; font-weight:500; cursor:pointer; font-family:var(--font);
            ">Send</button>
          </div>
        </div>
      </div>
    `;

    renderConvoList();
    renderChat();

    const input = container.querySelector('#msg-input');
    const sendBtn = container.querySelector('#msg-send');

    const send = () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendMessage(text);
    };

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    sendBtn.addEventListener('click', send);

    container.querySelector('#msg-new').addEventListener('click', () => {
      const name = prompt('Contact name:');
      if (!name) return;
      const id = 'contact-' + Date.now();
      conversations.push({ id, name, avatar: name[0]?.toUpperCase() || '?', messages: [], isAI: false });
      activeConvo = id;
      saveConversations(conversations);
      render();
    });
  }

  function renderConvoList() {
    const list = container.querySelector('#msg-list');
    list.innerHTML = conversations.map(c => {
      const lastMsg = c.messages[c.messages.length - 1];
      const preview = lastMsg ? lastMsg.text.slice(0, 40) + (lastMsg.text.length > 40 ? '...' : '') : 'No messages';
      const isActive = c.id === activeConvo;
      return `
        <div class="msg-convo" data-id="${c.id}" style="
          padding:12px 14px; cursor:pointer; display:flex; gap:10px; align-items:center;
          background:${isActive ? 'rgba(0,122,255,0.15)' : 'transparent'};
          transition: background 0.1s;
        ">
          <div style="width:36px; height:36px; border-radius:50%; background:${c.isAI ? 'linear-gradient(135deg, #007aff, #5856d6)' : stringColor(c.name)};
            display:flex; align-items:center; justify-content:center; font-size:${c.isAI ? '16px' : '14px'}; font-weight:600; flex-shrink:0;">
            ${c.avatar}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-size:13px; font-weight:${isActive ? '600' : '500'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.name)}</div>
            <div style="font-size:11px; color:rgba(255,255,255,0.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(preview)}</div>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.msg-convo').forEach(el => {
      el.addEventListener('click', () => {
        activeConvo = el.dataset.id;
        renderConvoList();
        renderChat();
      });
      el.addEventListener('mouseenter', () => { if (el.dataset.id !== activeConvo) el.style.background = 'rgba(255,255,255,0.04)'; });
      el.addEventListener('mouseleave', () => { if (el.dataset.id !== activeConvo) el.style.background = 'transparent'; });
    });
  }

  function renderChat() {
    const convo = conversations.find(c => c.id === activeConvo);
    if (!convo) return;

    const header = container.querySelector('#msg-header');
    header.innerHTML = `
      <div style="width:32px; height:32px; border-radius:50%; background:${convo.isAI ? 'linear-gradient(135deg, #007aff, #5856d6)' : stringColor(convo.name)};
        display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600;">${convo.avatar}</div>
      <div>
        <div style="font-size:13px; font-weight:600;">${esc(convo.name)}</div>
        <div style="font-size:10px; color:rgba(255,255,255,0.4);">${convo.isAI ? 'AI Assistant \u2022 Always online' : 'Contact'}</div>
      </div>
    `;

    const chat = container.querySelector('#msg-chat');
    chat.innerHTML = convo.messages.map(m => {
      const isMe = m.from === 'me';
      return `
        <div style="display:flex; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
          <div style="
            max-width:65%; padding:10px 14px; border-radius:${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};
            background:${isMe ? 'var(--accent)' : 'rgba(255,255,255,0.08)'};
            font-size:13px; line-height:1.5; word-break:break-word;
          ">
            ${esc(m.text).replace(/\n/g, '<br>')}
            <div style="font-size:9px; color:rgba(255,255,255,0.35); margin-top:4px; text-align:${isMe ? 'right' : 'left'};">
              ${formatTime(m.time)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    chat.scrollTop = chat.scrollHeight;
    container.querySelector('#msg-input')?.focus();
  }

  async function sendMessage(text) {
    const convo = conversations.find(c => c.id === activeConvo);
    if (!convo) return;

    convo.messages.push({ from: 'me', text, time: Date.now() });
    saveConversations(conversations);
    renderChat();
    sounds.tap();

    // AI response
    if (convo.isAI) {
      // Show typing indicator
      const chat = container.querySelector('#msg-chat');
      const typing = document.createElement('div');
      typing.style.cssText = 'display:flex; justify-content:flex-start;';
      typing.innerHTML = `<div style="padding:10px 14px; border-radius:18px 18px 18px 4px; background:rgba(255,255,255,0.08); font-size:13px; color:rgba(255,255,255,0.5);">
        <span class="typing-dots" style="display:inline-flex; gap:3px;">
          <span style="animation:blink 1.4s infinite;">.</span>
          <span style="animation:blink 1.4s infinite 0.2s;">.</span>
          <span style="animation:blink 1.4s infinite 0.4s;">.</span>
        </span>
      </div>`;
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;

      if (!document.getElementById('typing-css')) {
        const s = document.createElement('style');
        s.id = 'typing-css';
        s.textContent = '@keyframes blink { 0%,100% { opacity:0.3; } 50% { opacity:1; } }';
        document.head.appendChild(s);
      }

      try {
        const response = await aiService.ask(text);
        convo.messages.push({ from: 'them', text: response, time: Date.now() });
        sounds.notification();
      } catch {
        convo.messages.push({ from: 'them', text: "Sorry, I couldn't process that. Are you connected to the internet?", time: Date.now() });
      }

      saveConversations(conversations);
      renderChat();
    }
  }

  render();
}

function stringColor(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 40%)`;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
