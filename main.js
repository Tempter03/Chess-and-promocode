const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const promoCard = document.getElementById('promoCard');
const promoCodeEl = document.getElementById('promoCode');
const copyPromoBtn = document.getElementById('copyPromo');
const playAgainBtn = document.getElementById('playAgain');
const replayCta = document.getElementById('replayCta');
const replayBtn = document.getElementById('replayBtn');
const toastEl = document.getElementById('toast');

const state = {
  board: Array(9).fill(null),
  current: 'X',
  gameOver: false,
  chatId: null,
};

const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function initBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i += 1) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.dataset.index = i.toString();
    cell.setAttribute('aria-label', `Клетка ${i + 1}`);
    cell.addEventListener('click', onCellClick);
    boardEl.appendChild(cell);
  }
  render();
}

function initTelegram() {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();
    tg.expand();
    const userId = tg.initDataUnsafe?.user?.id;
    if (userId) {
      state.chatId = userId;
    }
  } catch (error) {
    console.warn('Telegram WebApp недоступен', error);
  }
}

function render() {
  const cells = boardEl.querySelectorAll('.cell');
  cells.forEach((cell) => {
    const idx = Number(cell.dataset.index);
    const value = state.board[idx];
    cell.textContent = value ?? '';
    cell.classList.toggle('x', value === 'X');
    cell.classList.toggle('o', value === 'O');
    cell.classList.toggle('disabled', !!value || state.gameOver || state.current === 'O');
  });

  if (state.gameOver) return;
  if (state.current === 'X') {
    statusEl.textContent = 'Ваш ход: крестики';
  } else {
    statusEl.textContent = 'Ход компьютера…';
  }
}

function onCellClick(event) {
  const target = event.currentTarget;
  if (state.gameOver || state.current !== 'X') return;
  const idx = Number(target.dataset.index);
  if (state.board[idx]) return;

  placeMark(idx, 'X');
  const winner = getWinner(state.board);
  if (winner) {
    finishGame(winner);
    return;
  }
  if (isDraw()) {
    finishGame(null);
    return;
  }

  state.current = 'O';
  render();
  setTimeout(computerMove, 320);
}

function computerMove() {
  if (state.gameOver) return;
  const move = findBestMove(state.board);
  if (move !== -1) {
    placeMark(move, 'O');
  }
  const winner = getWinner(state.board);
  if (winner) {
    finishGame(winner);
    return;
  }
  if (isDraw()) {
    finishGame(null);
    return;
  }
  state.current = 'X';
  render();
}

function placeMark(index, mark) {
  state.board[index] = mark;
  render();
}

function getWinner(board) {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isDraw() {
  return state.board.every(Boolean);
}

function findBestMove(board) {
  // 1) Попытка выиграть в один ход
  for (const [a, b, c] of winningLines) {
    const line = [board[a], board[b], board[c]];
    const marksO = line.filter((m) => m === 'O').length;
    const emptyIndex = [a, b, c].find((i) => !board[i]);
    if (marksO === 2 && emptyIndex !== undefined) return emptyIndex;
  }

  // 2) Блокировать выигрыш игрока
  for (const [a, b, c] of winningLines) {
    const line = [board[a], board[b], board[c]];
    const marksX = line.filter((m) => m === 'X').length;
    const emptyIndex = [a, b, c].find((i) => !board[i]);
    if (marksX === 2 && emptyIndex !== undefined) return emptyIndex;
  }

  // 3) Центр, если свободен
  if (!board[4]) return 4;

  // 4) Лёгкая сложность: случайная из оставшихся
  const free = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  if (free.length === 0) return -1;
  const randomIndex = Math.floor(Math.random() * free.length);
  return free[randomIndex];
}

function finishGame(winner) {
  state.gameOver = true;
  if (winner === 'X') {
    const code = generatePromo();
    promoCodeEl.textContent = code;
    promoCard.classList.remove('hidden');
    replayCta.classList.add('hidden');
    statusEl.textContent = 'Вы победили!';
    sendTelegramMessage(`Победа! Промокод выдан: ${code}`);
  } else if (winner === 'O') {
    statusEl.textContent = 'Компьютер выиграл в этот раз';
    promoCard.classList.add('hidden');
    replayCta.classList.remove('hidden');
    sendTelegramMessage('Проигрыш');
  } else {
    statusEl.textContent = 'Ничья — сыграем ещё?';
    promoCard.classList.add('hidden');
    replayCta.classList.remove('hidden');
  }
  render();
}

function generatePromo() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function resetGame() {
  state.board = Array(9).fill(null);
  state.current = 'X';
  state.gameOver = false;
  promoCard.classList.add('hidden');
  replayCta.classList.add('hidden');
  statusEl.textContent = 'Ваш ход: крестики';
  render();
}

async function sendTelegramMessage(text) {
  if (!text) return;
  if (!state.chatId) {
    showToast('Не удалось определить чат Telegram. Сообщение не отправлено.');
    return;
  }
  try {
    const response = await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: state.chatId, text }),
    });
    if (!response.ok) {
      throw new Error('Request failed');
    }
  } catch (error) {
    console.error('Send message error', error);
    showToast('Не удалось отправить сообщение в Telegram.');
  }
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 2600);
}

restartBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', resetGame);
replayBtn.addEventListener('click', resetGame);

copyPromoBtn.addEventListener('click', async () => {
  const code = promoCodeEl.textContent.trim();
  try {
    await navigator.clipboard.writeText(code);
    showToast('Промокод скопирован');
  } catch (error) {
    showToast('Скопируйте код вручную');
  }
});

initTelegram();
initBoard();

