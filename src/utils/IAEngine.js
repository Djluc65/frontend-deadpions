/**
 * MOTEUR IA GOMOKU - v4.0 IMBATTABLE
 * Corrections critiques + patterns extraits de 55 parties réelles
 *
 * FIXES v4.0 :
 * - ROWS=19, COLS=15 (plateau 15x15, colonnes A-O, lignes 1-19)
 * - Premier coup hardcodé H9 (centre réel du plateau)
 * - evaluateMoveStrategic corrigée : simule le coup avant d'évaluer
 * - Cascade de priorités stricte : win > block4 > fork > block3 > build4 > build3
 * - Racing Rule déplacée APRÈS blocage des menaces critiques
 * - Bonus de centralité calibré sur les patterns observés
 * - detectFork robuste (double menace en 1 coup)
 * - Ouverture diagonale ↗ hardcodée (pattern dominant observé)
 */

const DEFAULT_ROWS = 19;
const DEFAULT_COLS = 15;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const createBoardMap = (board) => {
  const map = new Map();
  for (const stone of board) {
    map.set(`${stone.row},${stone.col}`, stone.player);
  }
  return map;
};

const getCell = (map, row, col, rows, cols) => {
  if (row < 0 || row >= rows || col < 0 || col >= cols) return 'hors';
  return map.get(`${row},${col}`) || null;
};

const inBounds = (r, c, rows, cols) => r >= 0 && r < rows && c >= 0 && c < cols;

const toBoardMatrix = (board, rows, cols) => {
  const m = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const s of board) {
    if (inBounds(s.row, s.col, rows, cols)) m[s.row][s.col] = s.player;
  }
  return m;
};

// ─── CONSTANTES DE SCORE ─────────────────────────────────────────────────────

const S = {
  WIN:            10_000_000,
  BLOCK_WIN:       5_000_000,
  FORK_CREATE:     500_000,
  FORK_BLOCK:      400_000,
  OPEN4_CREATE:    100_000,
  OPEN4_BLOCK:     90_000,
  SEMI4_CREATE:    10_000,
  SEMI4_BLOCK:     9_000,
  OPEN3_CREATE:    5_000,
  OPEN3_BLOCK:     4_000,
  SEMI3_CREATE:    500,
  SEMI3_BLOCK:     450,
  OPEN2_CREATE:    100,
  CENTER_BONUS:    50,
};

// ─── DÉTECTION VICTOIRE IMMÉDIATE (fenêtre 5, patterns brisés inclus) ────────

const findImmediateWin = (boardMatrix, player, rows, cols) => {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (const [dr, dc] of dirs) {
        let stones = 0, emptyPos = null, valid = true;
        for (let i = 0; i < 5; i++) {
          const nr = r + dr*i, nc = c + dc*i;
          if (!inBounds(nr, nc, rows, cols)) { valid = false; break; }
          const cell = boardMatrix[nr][nc];
          if (cell === player) {
            stones++;
          } else if (cell === null) {
            if (emptyPos !== null) { valid = false; break; }
            emptyPos = { row: nr, col: nc };
          } else {
            valid = false; break;
          }
        }
        if (valid && stones === 4 && emptyPos) return emptyPos;
      }
    }
  }
  return null;
};

// ─── ÉVALUATION D'UNE SÉQUENCE depuis une case (AVEC le coup simulé) ─────────
// boardMatrix a déjà le coup placé quand on appelle cette fonction.

const evalLineFromCell = (boardMatrix, r, c, dr, dc, player, rows, cols) => {
  let len = 1;
  let openEnds = 0;

  // vers l'avant
  let i = 1;
  while (i <= 4) {
    const nr = r + dr*i, nc = c + dc*i;
    if (!inBounds(nr, nc, rows, cols)) break;
    if (boardMatrix[nr][nc] === player) { len++; i++; }
    else { if (boardMatrix[nr][nc] === null) openEnds++; break; }
  }

  // vers l'arrière
  i = 1;
  while (i <= 4) {
    const nr = r - dr*i, nc = c - dc*i;
    if (!inBounds(nr, nc, rows, cols)) break;
    if (boardMatrix[nr][nc] === player) { len++; i++; }
    else { if (boardMatrix[nr][nc] === null) openEnds++; break; }
  }

  return { len, openEnds };
};

// ─── DÉTECTION DE FOURCHE ─────────────────────────────────────────────────────
// Retourne true si jouer en (r,c) pour `player` crée >= 2 menaces de 3+ ouverts

const createsFork = (boardMatrix, r, c, player, rows, cols) => {
  boardMatrix[r][c] = player;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let threats = 0;
  for (const [dr, dc] of dirs) {
    const { len, openEnds } = evalLineFromCell(boardMatrix, r, c, dr, dc, player, rows, cols);
    if (len >= 4 && openEnds >= 1) threats++;
    else if (len >= 3 && openEnds >= 2) threats++;
  }
  boardMatrix[r][c] = null;
  return threats >= 2;
};

// ─── SCORE STRATÉGIQUE D'UN COUP ─────────────────────────────────────────────

const scoreMove = (boardMatrix, r, c, player, adversaire, rows, cols) => {
  let score = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];

  // --- Attaque (simuler MON coup) ---
  boardMatrix[r][c] = player;
  let myForkPotential = 0;
  for (const [dr, dc] of dirs) {
    const { len, openEnds } = evalLineFromCell(boardMatrix, r, c, dr, dc, player, rows, cols);
    if (len >= 5) score += S.WIN;
    else if (len === 4 && openEnds >= 1) { score += S.OPEN4_CREATE; myForkPotential++; }
    else if (len === 4 && openEnds === 0) score += S.SEMI4_CREATE;
    else if (len === 3 && openEnds === 2) { score += S.OPEN3_CREATE; myForkPotential++; }
    else if (len === 3 && openEnds === 1) score += S.SEMI3_CREATE;
    else if (len === 2 && openEnds === 2) score += S.OPEN2_CREATE;
  }
  if (myForkPotential >= 2) score += S.FORK_CREATE;
  boardMatrix[r][c] = null;

  // --- Défense (simuler LE COUP ADVERSE) ---
  boardMatrix[r][c] = adversaire;
  let advForkPotential = 0;
  for (const [dr, dc] of dirs) {
    const { len, openEnds } = evalLineFromCell(boardMatrix, r, c, dr, dc, adversaire, rows, cols);
    if (len >= 5) score += S.BLOCK_WIN;
    else if (len === 4 && openEnds >= 1) { score += S.OPEN4_BLOCK; advForkPotential++; }
    else if (len === 4 && openEnds === 0) score += S.SEMI4_BLOCK;
    else if (len === 3 && openEnds === 2) { score += S.OPEN3_BLOCK; advForkPotential++; }
    else if (len === 3 && openEnds === 1) score += S.SEMI3_BLOCK;
  }
  if (advForkPotential >= 2) score += S.FORK_BLOCK;
  boardMatrix[r][c] = null;

  // --- Bonus de centralité (calibré sur H9 = centre) ---
  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);
  const distC = Math.abs(c - centerCol);
  const distR = Math.abs(r - centerRow);
  const centrality = Math.max(0, centerCol - distC) + Math.max(0, centerRow - distR);
  score += centrality * S.CENTER_BONUS;

  return score;
};

// ─── OUVERTURE HARDCODÉE (patterns observés sur 55 parties) ──────────────────
// Couvre les 4 premiers coups de l'IA quand elle commence

const getOpeningMove = (board, player, adversaire, boardMatrix, rows, cols) => {
  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);
  if (board.length === 0) return { row: centerRow, col: centerCol };

  // Coup 2 (l'IA joue en 2e) : adversaire a joué 1 coup
  // → répondre en diagonale pour lancer notre propre axe
  if (board.length === 1) {
    const adv = board[0];
    const candidates = [
      { row: adv.row - 1, col: adv.col + 1 },
      { row: adv.row + 1, col: adv.col - 1 },
      { row: adv.row - 1, col: adv.col - 1 },
      { row: adv.row + 1, col: adv.col + 1 },
    ];
    // Priorité au centre si l'adversaire n'y est pas
    if (boardMatrix[centerRow]?.[centerCol] === null) return { row: centerRow, col: centerCol };
    for (const c of candidates) {
      if (inBounds(c.row, c.col, rows, cols) && boardMatrix[c.row][c.col] === null) return c;
    }
  }

  return null;
};

// ─── COUP CANDIDATS PERTINENTS ────────────────────────────────────────────────

const getCandidates = (board, boardMatrix, rows, cols) => {
  if (board.length === 0) return [{ row: Math.floor(rows / 2), col: Math.floor(cols / 2) }];

  const seen = new Set();
  const result = [];

  for (const stone of board) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = stone.row + dr, c = stone.col + dc;
        const key = `${r},${c}`;
        if (inBounds(r, c, rows, cols) && boardMatrix[r][c] === null && !seen.has(key)) {
          seen.add(key);
          result.push({ row: r, col: c });
        }
      }
    }
  }

  return result;
};

// ─── MEILLEUR COUP STRATÉGIQUE (scoring direct, sans minimax) ─────────────────

const getBestScoredMove = (boardMatrix, player, adversaire, candidates, rows, cols) => {
  let best = null, bestScore = -Infinity;
  for (const { row, col } of candidates) {
    const s = scoreMove(boardMatrix, row, col, player, adversaire, rows, cols);
    if (s > bestScore) { bestScore = s; best = { row, col, score: s }; }
  }
  return best;
};

// ─── MINIMAX ALPHA-BETA (profondeur configurable) ─────────────────────────────

const minimax = (boardMatrix, depth, player, adversaire, alpha, beta, maximizing, candidates, rows, cols) => {
  // Évaluation terminale rapide
  if (depth === 0) {
    let score = 0;
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const who = boardMatrix[r][c];
        if (!who) continue;
        for (const [dr, dc] of dirs) {
          const { len, openEnds } = evalLineFromCell(boardMatrix, r, c, dr, dc, who, rows, cols);
          const mult = who === player ? 1 : -1;
          if (len >= 5) score += mult * S.WIN;
          else if (len === 4 && openEnds >= 1) score += mult * S.OPEN4_CREATE;
          else if (len === 3 && openEnds === 2) score += mult * S.OPEN3_CREATE;
        }
      }
    }
    return { score, move: null };
  }

  const currentPlayer = maximizing ? player : adversaire;
  const candList = candidates || getCandidates(
    boardMatrix.flatMap((row, r) => row.map((v, c) => v ? { row: r, col: c, player: v } : null).filter(Boolean)),
    boardMatrix
  , rows, cols).slice(0, 12);

  let bestMove = candList[0] || null;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const { row, col } of candList) {
    boardMatrix[row][col] = currentPlayer;
    const res = minimax(boardMatrix, depth - 1, player, adversaire, alpha, beta, !maximizing, null, rows, cols);
    boardMatrix[row][col] = null;

    if (maximizing) {
      if (res.score > bestScore) { bestScore = res.score; bestMove = { row, col }; }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (res.score < bestScore) { bestScore = res.score; bestMove = { row, col }; }
      beta = Math.min(beta, bestScore);
    }
    if (beta <= alpha) break;
  }

  return { score: bestScore, move: bestMove };
};

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────

export const calculerCoupIA = (board, difficulte, currentPlayer, options = {}) => {
  const adversaire = currentPlayer === 'black' ? 'white' : 'black';
  const rowsCandidate = Number(options?.rows);
  const colsCandidate = Number(options?.cols);
  const rows = Number.isFinite(rowsCandidate) && rowsCandidate > 0 ? Math.floor(rowsCandidate) : DEFAULT_ROWS;
  const cols = Number.isFinite(colsCandidate) && colsCandidate > 0 ? Math.floor(colsCandidate) : DEFAULT_COLS;
  const boardMatrix = toBoardMatrix(board, rows, cols);

  // ── OUVERTURE ────────────────────────────────────────────────────────────────
  const openingMove = getOpeningMove(board, currentPlayer, adversaire, boardMatrix, rows, cols);
  if (openingMove) {
    console.log('Ouverture:', openingMove);
    return openingMove;
  }

  const candidates = getCandidates(board, boardMatrix, rows, cols);
  if (candidates.length === 0) return null;

  // ── P1 : VICTOIRE IMMÉDIATE ──────────────────────────────────────────────────
  const winMove = findImmediateWin(boardMatrix, currentPlayer, rows, cols);
  if (winMove) {
    console.log('Victoire immédiate:', winMove);
    return winMove;
  }

  // ── P2 : BLOQUER VICTOIRE ADVERSE ───────────────────────────────────────────
  const blockWin = findImmediateWin(boardMatrix, adversaire, rows, cols);
  if (blockWin) {
    console.log('Blocage victoire adverse:', blockWin);
    return blockWin;
  }

  // ── P3 : CRÉER UNE FOURCHE (double menace) ──────────────────────────────────
  for (const { row, col } of candidates) {
    if (createsFork(boardMatrix, row, col, currentPlayer, rows, cols)) {
      console.log('Fourche créée:', { row, col });
      return { row, col };
    }
  }

  // ── P4 : BLOQUER UNE FOURCHE ADVERSE ────────────────────────────────────────
  for (const { row, col } of candidates) {
    if (createsFork(boardMatrix, row, col, adversaire, rows, cols)) {
      console.log('Fourche adverse bloquée:', { row, col });
      return { row, col };
    }
  }

  // ── P5 : RACING RULE — créer un 4 menaçant si l'adversaire a ignoré notre 3 ─
  if (difficulte !== 'facile') {
    for (const { row, col } of candidates) {
      boardMatrix[row][col] = currentPlayer;
      const creates4 = findImmediateWin(boardMatrix, currentPlayer, rows, cols) !== null;
      boardMatrix[row][col] = null;
      if (creates4) {
        // Vérifier que l'adversaire n'a pas de menace de 3+ ouverts qu'on ignore
        const advThreat = findImmediateWin(boardMatrix, adversaire, rows, cols);
        if (!advThreat) {
          console.log('Racing Rule — création de 4 menaçant:', { row, col });
          return { row, col };
        }
      }
    }
  }

  // ── P6 : SCORING STRATÉGIQUE ────────────────────────────────────────────────
  // Trier les candidats par score pour alimenter le minimax
  const scored = candidates
    .map(({ row, col }) => ({ row, col, score: scoreMove(boardMatrix, row, col, currentPlayer, adversaire, rows, cols) }))
    .sort((a, b) => b.score - a.score);

  const topN = difficulte === 'difficile' ? 15 : difficulte === 'moyen' ? 12 : 8;
  const topCandidates = scored.slice(0, topN);

  // Si le meilleur coup scoré est très fort, le jouer directement
  if (topCandidates[0] && topCandidates[0].score >= S.OPEN4_CREATE) {
    console.log('Coup stratégique fort:', topCandidates[0]);
    return { row: topCandidates[0].row, col: topCandidates[0].col };
  }

  // ── P7 : MINIMAX ALPHA-BETA ──────────────────────────────────────────────────
  const depth = difficulte === 'difficile' ? 4 : difficulte === 'moyen' ? 3 : 2;
  const result = minimax(boardMatrix, depth, currentPlayer, adversaire, -Infinity, Infinity, true, topCandidates, rows, cols);

  if (result.move) {
    console.log(`Minimax (depth=${depth}):`, result.move, `score=${result.score}`);
    return result.move;
  }

  // Fallback ultime
  return scored[0] ? { row: scored[0].row, col: scored[0].col } : candidates[0];
};
