const COLS = 7;
const ROWS = 6;

const $ = (sel) => document.querySelector(sel);

const boardEl = $('#board');
const statusEl = $('#status');
const colHintsEl = $('#colHints');
const vsCpuEl = $('#vsCpu');
const newGameEl = $('#newGame');
const undoEl = $('#undo');
const resetScoreEl = $('#resetScore');
const scoreRedEl = $('#scoreRed');
const scoreYellowEl = $('#scoreYellow');
const scoreDrawEl = $('#scoreDraw');
const pwaInfoEl = $('#pwaInfo');

let board;
let currentPlayer; // 1 red, 2 yellow
let gameOver;
let moveHistory = []; // {col,row,player}

const SCORE_KEY = 'connect4-score-v1';
let score = loadScore();

function loadScore() {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return { red: 0, yellow: 0, draw: 0 };
    const s = JSON.parse(raw);
    if (typeof s?.red === 'number' && typeof s?.yellow === 'number' && typeof s?.draw === 'number') return s;
  } catch {}
  return { red: 0, yellow: 0, draw: 0 };
}

function saveScore() {
  localStorage.setItem(SCORE_KEY, JSON.stringify(score));
}

function renderScore() {
  scoreRedEl.textContent = String(score.red);
  scoreYellowEl.textContent = String(score.yellow);
  scoreDrawEl.textContent = String(score.draw);
}

function resetGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  currentPlayer = 1;
  gameOver = false;
  moveHistory = [];
  undoEl.disabled = true;
  render();
  setStatus();
}

function buildStaticUI() {
  // Column hints
  colHintsEl.innerHTML = '';
  for (let c = 0; c < COLS; c++) {
    const hint = document.createElement('div');
    hint.className = 'colHint';
    hint.textContent = String(c + 1);
    colHintsEl.appendChild(hint);
  }

  // Board cells
  boardEl.innerHTML = '';
  // Row-major (top to bottom)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);

      const btn = document.createElement('button');
      btn.className = 'cellBtn';
      btn.type = 'button';
      btn.setAttribute('aria-label', `Drop in column ${c + 1}`);
      btn.addEventListener('click', () => handleMove(c));
      cell.appendChild(btn);

      boardEl.appendChild(cell);
    }
  }
}

function setStatus(extra = '') {
  const who = currentPlayer === 1 ? 'Red' : 'Yellow';
  const dotClass = currentPlayer === 1 ? 'red' : 'yellow';
  const mode = vsCpuEl.checked ? 'vs CPU' : '2P';

  statusEl.innerHTML = `
    <span class="turnDot" style="background:${currentPlayer === 1 ? 'var(--red)' : 'var(--yellow)'}"></span>
    <strong>${gameOver ? 'Game over' : `${who}'s turn`}</strong>
    <span class="pill">${mode}</span>
    <span class="pill">Keys: 1–7</span>
    ${extra ? `<span class="pill">${extra}</span>` : ''}
  `;
}

function render() {
  // Clear discs
  for (const cell of boardEl.querySelectorAll('.cell')) {
    cell.querySelectorAll('.disc').forEach((d) => d.remove());
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    const v = board[r][c];
    const btn = cell.querySelector('.cellBtn');
    btn.disabled = gameOver || (vsCpuEl.checked && currentPlayer === 2); // lock when CPU thinking

    if (v !== 0) {
      const disc = document.createElement('div');
      disc.className = `disc ${v === 1 ? 'red' : 'yellow'}`;
      cell.appendChild(disc);
    }
  }
}

function findDropRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1;
}

function handleMove(col) {
  if (gameOver) return;
  if (vsCpuEl.checked && currentPlayer === 2) return; // CPU's turn

  const row = findDropRow(col);
  if (row === -1) {
    setStatus('Column full');
    return;
  }

  placeDisc(row, col, currentPlayer, true);

  if (!gameOver && vsCpuEl.checked && currentPlayer === 2) {
    // small delay for feel
    setTimeout(cpuTurn, 180);
  }
}

function placeDisc(row, col, player, pushHistory) {
  board[row][col] = player;
  if (pushHistory) moveHistory.push({ row, col, player });
  undoEl.disabled = moveHistory.length === 0 || (vsCpuEl.checked && moveHistory.length < 1);

  render();

  const winner = getWinner(board);
  if (winner) {
    gameOver = true;
    if (winner === 1) score.red++;
    else score.yellow++;
    saveScore();
    renderScore();
    highlightWin(winner);
    setStatus(`${winner === 1 ? 'Red' : 'Yellow'} wins`);
    render();
    return;
  }

  if (isDraw(board)) {
    gameOver = true;
    score.draw++;
    saveScore();
    renderScore();
    setStatus('Draw');
    render();
    return;
  }

  currentPlayer = player === 1 ? 2 : 1;
  setStatus();
  render();
}

function undo() {
  if (moveHistory.length === 0 || gameOver) return;

  const steps = vsCpuEl.checked ? 2 : 1;
  for (let i = 0; i < steps; i++) {
    const last = moveHistory.pop();
    if (!last) break;
    board[last.row][last.col] = 0;
    currentPlayer = last.player;
  }

  gameOver = false;
  undoEl.disabled = moveHistory.length === 0;
  setStatus('Undone');
  render();
}

function isDraw(b) {
  for (let c = 0; c < COLS; c++) if (b[0][c] === 0) return false;
  return true;
}

function getWinner(b) {
  // returns player number or 0
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (!p) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr][cc] !== p) {
            ok = false;
            break;
          }
        }
        if (ok) return p;
      }
    }
  }
  return 0;
}

function highlightWin(player) {
  // optional: keep it simple (no heavy DOM tracing) — add a subtle status note.
  // You can extend this to outline winning discs.
}

function cpuTurn() {
  if (gameOver || currentPlayer !== 2) return;
  const col = chooseCpuMove();
  const row = findDropRow(col);
  if (row === -1) {
    // should not happen, but fallback
    const valid = validMoves(board);
    if (valid.length === 0) return;
    const c2 = valid[Math.floor(Math.random() * valid.length)];
    placeDisc(findDropRow(c2), c2, 2, true);
    return;
  }
  placeDisc(row, col, 2, true);
}

function validMoves(b) {
  const moves = [];
  for (let c = 0; c < COLS; c++) if (b[0][c] === 0) moves.push(c);
  return moves;
}

function cloneBoard(b) {
  return b.map((row) => row.slice());
}

function simulateDrop(b, col, player) {
  const r = (() => {
    for (let rr = ROWS - 1; rr >= 0; rr--) if (b[rr][col] === 0) return rr;
    return -1;
  })();
  if (r === -1) return null;
  const nb = cloneBoard(b);
  nb[r][col] = player;
  return nb;
}

function chooseCpuMove() {
  const moves = validMoves(board);

  // 1) win now
  for (const c of moves) {
    const nb = simulateDrop(board, c, 2);
    if (nb && getWinner(nb) === 2) return c;
  }
  // 2) block opponent win
  for (const c of moves) {
    const nb = simulateDrop(board, c, 1);
    if (nb && getWinner(nb) === 1) return c;
  }

  // 3) score moves (center preference + avoid immediate losing response)
  const scored = moves.map((c) => {
    let s = 0;
    s += 6 - Math.abs(3 - c); // prefer center

    const nb = simulateDrop(board, c, 2);
    if (!nb) return { c, s: -999 };

    // small heuristic: count potential 2/3-in-a-row patterns
    s += heuristic(nb, 2) * 0.6;
    s -= heuristic(nb, 1) * 0.7;

    // avoid giving opponent immediate win
    const oppMoves = validMoves(nb);
    for (const oc of oppMoves) {
      const ob = simulateDrop(nb, oc, 1);
      if (ob && getWinner(ob) === 1) {
        s -= 100;
        break;
      }
    }
    return { c, s };
  });

  scored.sort((a, b) => b.s - a.s);
  const best = scored[0]?.s ?? 0;
  const top = scored.filter((x) => x.s >= best - 1.2).slice(0, 3);
  return top[Math.floor(Math.random() * top.length)].c;
}

function heuristic(b, player) {
  // counts windows of 4 with only player's discs + empties
  let count = 0;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of dirs) {
        let pcs = 0;
        let empties = 0;
        let ok = true;
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) {
            ok = false;
            break;
          }
          const v = b[rr][cc];
          if (v === player) pcs++;
          else if (v === 0) empties++;
          else {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        if (pcs === 2 && empties === 2) count += 1;
        if (pcs === 3 && empties === 1) count += 3;
      }
    }
  }
  return count;
}

function setupEvents() {
  newGameEl.addEventListener('click', () => resetGame());
  undoEl.addEventListener('click', () => undo());
  resetScoreEl.addEventListener('click', () => {
    score = { red: 0, yellow: 0, draw: 0 };
    saveScore();
    renderScore();
    setStatus('Score reset');
  });

  vsCpuEl.addEventListener('change', () => {
    resetGame();
    setStatus(vsCpuEl.checked ? 'CPU is Yellow' : 'Two players');
  });

  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k >= '1' && k <= '7') {
      handleMove(Number(k) - 1);
    }
    if (k === 'u' || (e.ctrlKey && k.toLowerCase() === 'z')) {
      undo();
    }
  });
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) {
    pwaInfoEl.textContent = 'Service Worker not supported in this browser.';
    return;
  }
  try {
    navigator.serviceWorker.register("./sw.js", { scope: "./" });
    pwaInfoEl.textContent = 'Offline cache enabled.';

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          pwaInfoEl.textContent = 'Update available — refresh to get it.';
        }
      });
    });
  } catch {
    pwaInfoEl.textContent = 'Service Worker registration failed.';
  }
}

function init() {
  buildStaticUI();
  setupEvents();
  renderScore();
  resetGame();
  registerSW();
}

init();
