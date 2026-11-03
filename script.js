/**
 * VoiceCalc Pro - Frontend Engine
 * Software Engineering & DevOps Practicum
 *
 * Implements:
 * 1. Web Speech API (SpeechRecognition) for voice-to-calculation
 * 2. SpeechSynthesis API for voice feedback
 * 3. Safe, non-eval mathematical evaluation engine (Operator Precedence / Shunting-yard)
 * 4. Responsive UI interactions, dark/light theme, calculation history, keyboard navigation
 */

(() => {
  'use strict';

  // ==========================================
  // DOM Elements
  // ==========================================
  const exprDisplay = document.getElementById('expression-display');
  const resDisplay = document.getElementById('result-display');
  const micBtn = document.getElementById('mic-btn');
  const voiceStatusBar = document.getElementById('voice-status-bar');
  const voiceStatusText = document.getElementById('voice-status-text');
  const audioWave = document.getElementById('audio-wave');
  const ttsToggle = document.getElementById('tts-toggle');
  const ttsOnIcon = document.getElementById('tts-on-icon');
  const ttsOffIcon = document.getElementById('tts-off-icon');
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const historyToggle = document.getElementById('history-toggle');
  const historyPanel = document.getElementById('history-panel');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const historyList = document.getElementById('history-list');
  const helpToggle = document.getElementById('help-toggle');
  const helpModal = document.getElementById('help-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalOkBtn = document.getElementById('modal-ok-btn');
  const toast = document.getElementById('toast');

  // ==========================================
  // Calculator State
  // ==========================================
  let currentExpression = '';
  let currentResult = '0';
  let isEvaluated = false;
  let isVoiceActive = false;
  let isTTSMuted = localStorage.getItem('voicecalc_tts_muted') === 'true';
  let historyData = JSON.parse(localStorage.getItem('voicecalc_history') || '[]');

  // ==========================================
  // Sound & Speech Synthesis Setup
  // ==========================================
  const synth = window.speechSynthesis;
  let preferredVoice = null;

  function loadVoices() {
    if (!synth) return;
    const voices = synth.getVoices();
    // Prefer clean English voice
    preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')))
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
  }

  if (synth) {
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  function speak(text) {
    if (!synth || isTTSMuted) return;
    try {
      synth.cancel(); // Stop any pending utterance
      const cleanText = text
        .replace(/\*/g, ' times ')
        .replace(/\//g, ' divided by ')
        .replace(/-/g, ' minus ')
        .replace(/\+/g, ' plus ')
        .replace(/\^/g, ' to the power of ')
        .replace(/sqrt/g, ' square root of ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        document.body.classList.add('speaking');
      };
      utterance.onend = utterance.onerror = () => {
        document.body.classList.remove('speaking');
      };

      synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  // ==========================================
  // Web Speech API (Speech Recognition)
  // ==========================================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isVoiceActive = true;
      micBtn.classList.add('active-listening');
      voiceStatusBar.classList.add('listening');
      audioWave.classList.remove('hidden');
      voiceStatusText.textContent = 'Listening... Speak your calculation';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      voiceStatusText.textContent = `Heard: "${transcript}"`;
      handleVoiceTranscript(transcript);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopListening();
      let errorMsg = 'Could not understand voice.';
      if (event.error === 'not-allowed') {
        errorMsg = 'Microphone permission blocked. Please enable mic access.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Please try again.';
      } else if (event.error === 'network') {
        errorMsg = 'Network error during speech recognition.';
      }
      showToast(errorMsg);
      voiceStatusText.textContent = errorMsg;
    };

    recognition.onend = () => {
      stopListening();
    };
  } else {
    voiceStatusText.textContent = 'Web Speech API not supported in this browser';
    micBtn.title = 'Speech Recognition is supported in Google Chrome, Edge, and Safari.';
  }

  function startListening() {
    if (!recognition) {
      showToast('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (isVoiceActive) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (err) {
      console.error(err);
      recognition.stop();
    }
  }

  function stopListening() {
    isVoiceActive = false;
    micBtn.classList.remove('active-listening');
    voiceStatusBar.classList.remove('listening');
    audioWave.classList.add('hidden');
    if (!voiceStatusText.textContent.startsWith('Heard:')) {
      voiceStatusText.textContent = 'Click mic or press Space to speak';
    }
  }

  // ==========================================
  // Voice Input NLP & Grammar Parser
  // Converts natural spoken English into math
  // ==========================================
  const numberWordsMap = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100, thousand: 1000
  };

  function parseSpokenWordsToNumbers(text) {
    let words = text.toLowerCase().split(/\s+/);
    let output = [];
    let i = 0;

    while (i < words.length) {
      let word = words[i];
      if (word === 'point' && i > 0 && i < words.length - 1 && !isNaN(words[i + 1])) {
        output.push('.');
        i++;
        continue;
      }

      // Check compound numbers like "twenty five"
      if (numberWordsMap[word] !== undefined) {
        let val = numberWordsMap[word];
        if (val >= 20 && val <= 90 && i + 1 < words.length && numberWordsMap[words[i + 1]] !== undefined && numberWordsMap[words[i + 1]] < 10) {
          val += numberWordsMap[words[i + 1]];
          i++;
        }
        output.push(val);
      } else {
        output.push(word);
      }
      i++;
    }
    return output.join(' ');
  }

  function handleVoiceTranscript(rawText) {
    const text = parseSpokenWordsToNumbers(
      rawText
        .toLowerCase()
        .replace(/[?.,!]/g, '')
        .trim()
    );

    // Voice Commands
    if (text === 'clear' || text === 'reset' || text === 'all clear') {
      clearAll();
      speak('Cleared');
      return;
    }
    if (text === 'delete' || text === 'backspace') {
      backspace();
      return;
    }
    if (text === 'equals' || text === 'calculate' || text === 'solve') {
      evaluateCurrent();
      return;
    }

    let parsed = text;

    // Remove filler introductory phrases
    parsed = parsed
      .replace(/^what is\s+/i, '')
      .replace(/^calculate\s+/i, '')
      .replace(/^solve\s+/i, '')
      .replace(/^compute\s+/i, '')
      .replace(/^how much is\s+/i, '');

    // Pattern: "add X and Y" or "add X to Y" -> X + Y
    const addMatch = parsed.match(/^add\s+([\d.]+)\s+(?:and|to)\s+([\d.]+)/i);
    if (addMatch) {
      executeVoiceExpression(`${addMatch[1]} + ${addMatch[2]}`);
      return;
    }

    // Pattern: "subtract X from Y" -> Y - X
    const subMatch = parsed.match(/^subtract\s+([\d.]+)\s+from\s+([\d.]+)/i);
    if (subMatch) {
      executeVoiceExpression(`${subMatch[2]} - ${subMatch[1]}`);
      return;
    }

    // Pattern: "multiply X by Y" -> X * Y
    const mulMatch = parsed.match(/^multiply\s+([\d.]+)\s+by\s+([\d.]+)/i);
    if (mulMatch) {
      executeVoiceExpression(`${mulMatch[1]} * ${mulMatch[2]}`);
      return;
    }

    // Pattern: "divide X by Y" -> X / Y
    const divMatch = parsed.match(/^divide\s+([\d.]+)\s+by\s+([\d.]+)/i);
    if (divMatch) {
      executeVoiceExpression(`${divMatch[1]} / ${divMatch[2]}`);
      return;
    }

    // Pattern: "X percent of Y" or "what is X percent of Y" -> (X / 100) * Y
    const pctMatch = parsed.match(/([\d.]+)\s*(?:%|percent)\s+(?:of\s+)?([\d.]+)/i);
    if (pctMatch) {
      const p = parseFloat(pctMatch[1]);
      const total = parseFloat(pctMatch[2]);
      const res = (p / 100) * total;
      recordCalculation(`${p}% of ${total}`, res, true);
      speak(`The answer is ${res}`);
      return;
    }

    // Pattern: "square root of X" or "root X" -> sqrt(X)
    const sqrtMatch = parsed.match(/(?:square\s+root\s+(?:of\s+)?|root\s+)([\d.]+)/i);
    if (sqrtMatch) {
      executeVoiceExpression(`sqrt(${sqrtMatch[1]})`);
      return;
    }

    // Pattern: "X squared" or "square of X" -> X^2
    const sqMatch1 = parsed.match(/([\d.]+)\s*squared/i);
    const sqMatch2 = parsed.match(/square\s+(?:of\s+)([\d.]+)/i);
    if (sqMatch1) {
      executeVoiceExpression(`${sqMatch1[1]} ^ 2`);
      return;
    }
    if (sqMatch2) {
      executeVoiceExpression(`${sqMatch2[1]} ^ 2`);
      return;
    }

    // Pattern: "X to the power of Y" or "X power Y" -> X ^ Y
    const powMatch = parsed.match(/([\d.]+)\s*(?:to\s+the\s+power\s+of|power|raised\s+to|pow)\s*([\d.]+)/i);
    if (powMatch) {
      executeVoiceExpression(`${powMatch[1]} ^ ${powMatch[2]}`);
      return;
    }

    // Pattern: Trigonometric "sine of X", "cos 60", "tan 45"
    const trigMatch = parsed.match(/(sin|sine|cos|cosine|tan|tangent)\s*(?:of\s+)?([\d.]+)/i);
    if (trigMatch) {
      let func = trigMatch[1].toLowerCase();
      if (func === 'sine') func = 'sin';
      if (func === 'cosine') func = 'cos';
      if (func === 'tangent') func = 'tan';
      executeVoiceExpression(`${func}(${trigMatch[2]})`);
      return;
    }

    // Arithmetic operator normalization
    let mathExpr = parsed
      .replace(/\s*plus\s*/g, ' + ')
      .replace(/\s*minus\s*/g, ' - ')
      .replace(/\s*(?:times|multiplied\s+by|into)\s*/g, ' * ')
      .replace(/\s*(?:divided\s+by|over)\s*/g, ' / ')
      .replace(/\s*(?:to\s+the\s+power\s+of|power|raised\s+to)\s*/g, ' ^ ')
      .replace(/\s*percent\s*/g, ' % ')
      .replace(/x/g, '*')
      .trim();

    // Check if cleaned string looks like a valid math expression
    if (/^[\d\s+\-*/^().%sqrtcointa]+$/.test(mathExpr)) {
      executeVoiceExpression(mathExpr);
    } else {
      showToast(`Could not translate: "${rawText}"`);
      voiceStatusText.textContent = `Unsupported voice command: "${rawText}"`;
      speak("Sorry, I could not understand that calculation.");
    }
  }

  function executeVoiceExpression(expr) {
    try {
      const result = safeEvaluate(expr);
      recordCalculation(expr, result, true);
      speak(`The answer is ${result}`);
    } catch (err) {
      showToast(err.message || 'Invalid Expression');
      speak(`Error: ${err.message || 'calculation failed'}`);
    }
  }

  // ==========================================
  // Safe Math Expression Evaluator (No eval)
  // Shunting-Yard Algorithm + RPN Evaluator
  // ==========================================
  function tokenize(str) {
    const tokens = [];
    let i = 0;
    const s = str.replace(/\s+/g, '');

    while (i < s.length) {
      const char = s[i];

      // Numbers (including decimals)
      if (/\d/.test(char) || (char === '.' && i + 1 < s.length && /\d/.test(s[i + 1]))) {
        let numStr = '';
        while (i < s.length && (/[\d.]/.test(s[i]))) {
          numStr += s[i];
          i++;
        }
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        continue;
      }

      // Identifiers / Functions (sin, cos, tan, sqrt, pi, e)
      if (/[a-zA-Z]/.test(char)) {
        let word = '';
        while (i < s.length && /[a-zA-Z]/.test(s[i])) {
          word += s[i];
          i++;
        }
        word = word.toLowerCase();
        if (word === 'pi') {
          tokens.push({ type: 'number', value: Math.PI });
        } else if (word === 'e') {
          tokens.push({ type: 'number', value: Math.E });
        } else if (['sin', 'cos', 'tan', 'sqrt'].includes(word)) {
          tokens.push({ type: 'function', value: word });
        } else {
          throw new Error(`Unknown function: ${word}`);
        }
        continue;
      }

      // Operators & Parentheses
      if ('+-*/^()%'.includes(char)) {
        // Distinguish unary minus (e.g. -5, or 2 * -3)
        if (char === '-') {
          const prev = tokens[tokens.length - 1];
          if (!prev || prev.type === 'operator' || (prev.type === 'paren' && prev.value === '(')) {
            tokens.push({ type: 'number', value: -1 });
            tokens.push({ type: 'operator', value: '*' });
            i++;
            continue;
          }
        }

        if (char === '(' || char === ')') {
          tokens.push({ type: 'paren', value: char });
        } else {
          tokens.push({ type: 'operator', value: char });
        }
        i++;
        continue;
      }

      throw new Error(`Unexpected character: ${char}`);
    }

    return tokens;
  }

  function shuntingYard(tokens) {
    const outputQueue = [];
    const operatorStack = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
    const associativity = { '+': 'L', '-': 'L', '*': 'L', '/': 'L', '%': 'L', '^': 'R' };

    for (let token of tokens) {
      if (token.type === 'number') {
        outputQueue.push(token);
      } else if (token.type === 'function') {
        operatorStack.push(token);
      } else if (token.type === 'operator') {
        const o1 = token.value;
        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.type === 'function') {
            outputQueue.push(operatorStack.pop());
            continue;
          }
          if (top.type === 'operator') {
            const o2 = top.value;
            if (
              (associativity[o1] === 'L' && precedence[o1] <= precedence[o2]) ||
              (associativity[o1] === 'R' && precedence[o1] < precedence[o2])
            ) {
              outputQueue.push(operatorStack.pop());
              continue;
            }
          }
          break;
        }
        operatorStack.push(token);
      } else if (token.type === 'paren' && token.value === '(') {
        operatorStack.push(token);
      } else if (token.type === 'paren' && token.value === ')') {
        let foundLeft = false;
        while (operatorStack.length > 0) {
          const top = operatorStack.pop();
          if (top.type === 'paren' && top.value === '(') {
            foundLeft = true;
            break;
          }
          outputQueue.push(top);
        }
        if (!foundLeft) throw new Error('Mismatched parentheses');
        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
          outputQueue.push(operatorStack.pop());
        }
      }
    }

    while (operatorStack.length > 0) {
      const top = operatorStack.pop();
      if (top.type === 'paren') throw new Error('Mismatched parentheses');
      outputQueue.push(top);
    }

    return outputQueue;
  }

  function evaluateRPN(postfix) {
    const stack = [];

    for (let token of postfix) {
      if (token.type === 'number') {
        stack.push(token.value);
      } else if (token.type === 'function') {
        if (stack.length < 1) throw new Error('Missing operand for function');
        const arg = stack.pop();
        let res;
        if (token.value === 'sqrt') {
          if (arg < 0) throw new Error('Negative square root is undefined');
          res = Math.sqrt(arg);
        } else if (token.value === 'sin') {
          res = Math.sin((arg * Math.PI) / 180); // Degrees
        } else if (token.value === 'cos') {
          res = Math.cos((arg * Math.PI) / 180);
        } else if (token.value === 'tan') {
          if (Math.abs((arg - 90) % 180) < 1e-9) throw new Error('Tangent undefined');
          res = Math.tan((arg * Math.PI) / 180);
        }
        stack.push(roundPrecision(res));
      } else if (token.type === 'operator') {
        if (stack.length < 2) throw new Error('Invalid expression format');
        const b = stack.pop();
        const a = stack.pop();
        let res;
        switch (token.value) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) throw new Error('Cannot divide by zero');
            res = a / b;
            break;
          case '%':
            res = (a / 100) * b; // standard percentage: a% of b
            break;
          case '^':
            if (a === 0 && b < 0) throw new Error('Zero to negative power');
            res = Math.pow(a, b);
            break;
        }
        stack.push(roundPrecision(res));
      }
    }

    if (stack.length !== 1) throw new Error('Invalid expression');
    return stack[0];
  }

  function roundPrecision(val) {
    if (isNaN(val) || !isFinite(val)) return val;
    return Math.round(val * 1e10) / 1e10;
  }

  function safeEvaluate(exprStr) {
    if (!exprStr || !exprStr.trim()) return 0;
    const tokens = tokenize(exprStr);
    const rpn = shuntingYard(tokens);
    return evaluateRPN(rpn);
  }

  // ==========================================
  // Display & Keypad Actions
  // ==========================================
  function updateDisplays() {
    exprDisplay.textContent = currentExpression;
    resDisplay.textContent = currentResult || '0';
  }

  function appendCharacter(char) {
    if (isEvaluated) {
      if ('+-*/^%'.includes(char)) {
        currentExpression = currentResult;
      } else {
        currentExpression = '';
      }
      isEvaluated = false;
    }

    currentExpression += char;
    updateDisplays();
  }

  function backspace() {
    if (isEvaluated) {
      clearAll();
      return;
    }
    currentExpression = currentExpression.slice(0, -1);
    updateDisplays();
  }

  function clearAll() {
    currentExpression = '';
    currentResult = '0';
    isEvaluated = false;
    updateDisplays();
  }

  function toggleNegate() {
    if (!currentExpression && currentResult !== '0') {
      currentResult = (-parseFloat(currentResult)).toString();
      updateDisplays();
      return;
    }
    if (currentExpression.startsWith('-(') && currentExpression.endsWith(')')) {
      currentExpression = currentExpression.slice(2, -1);
    } else {
      currentExpression = `-(${currentExpression})`;
    }
    updateDisplays();
  }

  function insertParentheses() {
    const openCount = (currentExpression.match(/\(/g) || []).length;
    const closeCount = (currentExpression.match(/\)/g) || []).length;
    const lastChar = currentExpression.slice(-1);

    if (openCount > closeCount && !'+-*/^('.includes(lastChar)) {
      appendCharacter(')');
    } else {
      appendCharacter('(');
    }
  }

  function evaluateCurrent() {
    if (!currentExpression.trim()) return;
    try {
      const res = safeEvaluate(currentExpression);
      recordCalculation(currentExpression, res, false);
      speak(`The answer is ${res}`);
    } catch (err) {
      showToast(err.message || 'Syntax Error');
      currentResult = 'Error';
      updateDisplays();
      speak(`Error: ${err.message || 'calculation failed'}`);
    }
  }

  function recordCalculation(expression, result, isVoice = false) {
    currentResult = result.toString();
    currentExpression = expression;
    isEvaluated = true;
    updateDisplays();

    const historyItem = {
      id: Date.now(),
      expression,
      result: currentResult,
      isVoice,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    historyData.unshift(historyItem);
    if (historyData.length > 30) historyData.pop();
    localStorage.setItem('voicecalc_history', JSON.stringify(historyData));
    renderHistory();
  }

  // ==========================================
  // History Panel Management
  // ==========================================
  function renderHistory() {
    if (historyData.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>No calculations yet.<br>Speak or calculate to record history.</p>
        </div>`;
      return;
    }

    historyList.innerHTML = historyData.map(item => `
      <div class="history-item" data-res="${item.result}">
        <div class="history-item-top">
          <span>${item.time}</span>
          ${item.isVoice ? `
            <span class="voice-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
              Voice
            </span>` : ''}
        </div>
        <div class="history-expr">${item.expression} =</div>
        <div class="history-res">${item.result}</div>
      </div>
    `).join('');

    // Attach click to reuse result
    document.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const val = el.getAttribute('data-res');
        currentExpression = val;
        currentResult = val;
        isEvaluated = false;
        updateDisplays();
        showToast(`Loaded ${val} into calculator`);
      });
    });
  }

  function clearHistory() {
    historyData = [];
    localStorage.removeItem('voicecalc_history');
    renderHistory();
    showToast('History cleared');
  }

  // ==========================================
  // Event Listeners & Keypad Bindings
  // ==========================================
  document.querySelectorAll('.key').forEach(button => {
    button.addEventListener('click', () => {
      const num = button.getAttribute('data-number');
      const op = button.getAttribute('data-operator');
      const action = button.getAttribute('data-action');

      if (num !== null) appendCharacter(num);
      if (op !== null) appendCharacter(` ${op} `);

      if (action) {
        switch (action) {
          case 'clear': clearAll(); break;
          case 'backspace': backspace(); break;
          case 'calculate': evaluateCurrent(); break;
          case 'parens': insertParentheses(); break;
          case 'decimal': appendCharacter('.'); break;
          case 'negate': toggleNegate(); break;
          case 'sqrt': appendCharacter('sqrt('); break;
          case 'square': appendCharacter(' ^ 2'); break;
          case 'power': appendCharacter(' ^ '); break;
          case 'percent': appendCharacter(' % '); break;
          case 'sin': appendCharacter('sin('); break;
          case 'cos': appendCharacter('cos('); break;
          case 'tan': appendCharacter('tan('); break;
          case 'pi': appendCharacter('pi'); break;
        }
      }
    });
  });

  // Suggestion Pills
  document.querySelectorAll('.hint-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const phrase = pill.getAttribute('data-phrase');
      voiceStatusText.textContent = `Demo voice: "${phrase}"`;
      handleVoiceTranscript(phrase);
    });
  });

  // Mic Button Click
  micBtn.addEventListener('click', startListening);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // If modal is active, let Escape close modal
    if (!helpModal.classList.contains('hidden')) {
      if (e.key === 'Escape') helpModal.classList.add('hidden');
      return;
    }

    if (e.key >= '0' && e.key <= '9') {
      appendCharacter(e.key);
    } else if (e.key === '.') {
      appendCharacter('.');
    } else if (['+', '-', '*', '/'].includes(e.key)) {
      appendCharacter(` ${e.key} `);
    } else if (e.key === '^') {
      appendCharacter(' ^ ');
    } else if (e.key === '%') {
      appendCharacter(' % ');
    } else if (e.key === '(' || e.key === ')') {
      appendCharacter(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      evaluateCurrent();
    } else if (e.key === 'Backspace') {
      backspace();
    } else if (e.key === 'Escape') {
      clearAll();
    } else if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      startListening();
    }
  });

  // TTS Toggle
  ttsToggle.addEventListener('click', () => {
    isTTSMuted = !isTTSMuted;
    localStorage.setItem('voicecalc_tts_muted', isTTSMuted);
    updateTTSIcons();
    showToast(isTTSMuted ? 'Voice feedback muted' : 'Voice feedback enabled');
  });

  function updateTTSIcons() {
    if (isTTSMuted) {
      ttsOnIcon.classList.add('hidden');
      ttsOffIcon.classList.remove('hidden');
    } else {
      ttsOnIcon.classList.remove('hidden');
      ttsOffIcon.classList.add('hidden');
    }
  }

  // Theme Toggle (Dark / Light)
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('voicecalc_theme', newTheme);
    updateThemeIcons(newTheme);
  });

  function updateThemeIcons(theme) {
    if (theme === 'light') {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  }

  // History Toggle / Close
  historyToggle.addEventListener('click', () => {
    historyPanel.classList.toggle('collapsed');
  });
  closeHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.add('collapsed');
  });
  clearHistoryBtn.addEventListener('click', clearHistory);

  // Help Modal
  helpToggle.addEventListener('click', () => helpModal.classList.remove('hidden'));
  closeModalBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
  modalOkBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });

  // Toast Notification
  let toastTimer = null;
  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // ==========================================
  // Initialization
  // ==========================================
  const savedTheme = localStorage.getItem('voicecalc_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcons(savedTheme);
  updateTTSIcons();
  renderHistory();
  updateDisplays();

})();

