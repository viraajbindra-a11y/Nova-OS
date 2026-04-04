// NOVA OS — AI Service
// Provides AI capabilities across the OS.
// Currently uses a mock for demos. Connect to a real API by changing the ask() method.

class AIService {
  constructor() {
    this.apiEndpoint = '/api/ai';
    this.conversationHistory = [];
    this.context = {};
  }

  setContext(key, value) {
    this.context[key] = value;
  }

  clearContext(key) {
    delete this.context[key];
  }

  async ask(prompt, options = {}) {
    const systemContext = this._buildSystemContext();

    // Try real API first, fall back to local mock
    try {
      const res = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system: systemContext,
          messages: [
            ...this.conversationHistory.slice(-6),
            { role: 'user', content: prompt }
          ],
          model: options.model || 'claude-haiku-4-5-20251001',
          max_tokens: options.maxTokens || 1024,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.content?.[0]?.text || data.reply || '';
        this.conversationHistory.push({ role: 'user', content: prompt });
        this.conversationHistory.push({ role: 'assistant', content: reply });
        return reply;
      }
    } catch (e) {
      // API not available, use mock
    }

    return this._mockResponse(prompt);
  }

  _buildSystemContext() {
    let ctx = `You are NOVA, the built-in AI assistant for NOVA OS — an AI-native desktop operating system. You are helpful, concise, and knowledgeable.\n`;

    if (this.context.activeApp) {
      ctx += `\nThe user is currently using: ${this.context.activeApp}`;
    }
    if (this.context.activeFile) {
      ctx += `\nActive file: ${this.context.activeFile}`;
    }
    if (this.context.selectedText) {
      ctx += `\nSelected text: ${this.context.selectedText}`;
    }
    if (this.context.terminalOutput) {
      ctx += `\nRecent terminal output: ${this.context.terminalOutput}`;
    }

    return ctx;
  }

  _mockResponse(prompt) {
    const lower = prompt.toLowerCase();

    // App launching
    if (lower.includes('open') && lower.includes('terminal')) return 'Opening Terminal for you!';
    if (lower.includes('open') && lower.includes('notes')) return 'Opening Notes for you!';
    if (lower.includes('open') && lower.includes('calculator')) return 'Opening Calculator for you!';
    if (lower.includes('open') && lower.includes('settings')) return 'Opening Settings for you!';
    if (lower.includes('open') && lower.includes('finder')) return 'Opening Finder for you!';

    // Helpful responses
    if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi') {
      return 'Hello! I\'m NOVA, your AI assistant. I can help you with tasks, answer questions, open apps, search files, and more. What would you like to do?';
    }
    if (lower.includes('what can you do') || lower.includes('help')) {
      return 'I can help you with:\n\n\u2022 Open apps: "open terminal", "open notes"\n\u2022 Search files: "find my documents"\n\u2022 Answer questions: ask me anything!\n\u2022 Write & edit text: "write a poem", "summarize this"\n\u2022 Math: "what is 235 * 47"\n\u2022 System info: "what time is it"\n\nJust type naturally and I\'ll do my best!';
    }
    if (lower.includes('time') || lower.includes('what time')) {
      return `It's ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}.`;
    }
    if (lower.includes('weather')) {
      return 'I don\'t have real weather data yet, but once connected to an API, I\'ll be able to tell you! For now, I\'d say it\'s a great day to code.';
    }
    if (lower.includes('joke')) {
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs!',
        'There are only 10 types of people in the world: those who understand binary and those who don\'t.',
        'A SQL query walks into a bar, sees two tables, and asks... "Can I JOIN you?"',
        'Why was the JavaScript developer sad? Because he didn\'t Node how to Express himself.',
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (lower.includes('who are you') || lower.includes('what are you')) {
      return 'I\'m NOVA, the AI assistant built into NOVA OS. I\'m here to make your computing experience smarter and more productive. Think of me as a really knowledgeable friend who lives inside your computer!';
    }

    // Math
    const mathMatch = lower.match(/(?:what is |calculate |compute |solve )?([\d\s+\-*/.()]+)/);
    if (mathMatch) {
      try {
        const expr = mathMatch[1].trim();
        if (/^[\d\s+\-*/.()]+$/.test(expr) && expr.length > 1) {
          const result = Function('"use strict"; return (' + expr + ')')();
          if (typeof result === 'number' && isFinite(result)) {
            return `${expr} = ${result}`;
          }
        }
      } catch (e) { /* not a math expression */ }
    }

    // Default
    return `I understand you're asking about "${prompt.substring(0, 60)}". In the full version of NOVA OS, I'll be connected to a powerful AI model that can help with anything. For now, try:\n\n\u2022 "help" to see what I can do\n\u2022 "open [app name]" to launch an app\n\u2022 "tell me a joke" for fun\n\u2022 Math like "42 * 17"`;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

export const aiService = new AIService();
