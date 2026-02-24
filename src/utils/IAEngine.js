
/**
 * MOTEUR IA GOMOKU - SYSTÈME MULTI-MENACES & FOURCHES (v3.1)
 * Basé sur "IA Gomoku Imbattable - Système de Défense Ultime.odt"
 * 
 * CARACTÉRISTIQUES v3.1 :
 * - Détection des Fourches (Double Menaces)
 * - Construction de Réseau (Jeu positionnel)
 * - Défense Agressive (Contre-attaque prioritaire)
 * - Gestion des patterns complexes (4 brisés, 3 brisés, etc.)
 */

const ROWS = 30;
const COLS = 18;

// --- HELPERS O(1) ---

const createBoardMap = (board) => {
  const map = new Map();
  for (const stone of board) {
    map.set(`${stone.row},${stone.col}`, stone.player);
  }
  return map;
};

const getCell = (map, row, col) => {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 'hors';
  return map.get(`${row},${col}`) || null;
};

// --- DÉTECTION DES MENACES (CORE) ---

const scanPatterns = (boardArray, map, joueur) => {
  const menaces = {
    cinq: [],
    quatre_direct: [], // XXXX. ou .XXXX
    quatre_brise: [],  // X.XXX, XX.XX, XXX.X
    trois_ouvert: [],  // .XXX.
    trois_brise: [],   // .X.XX. ou .XX.X.
    deux_ouvert: [],   // .XX.
    deux_brise: []     // .X.X.
  };

  const directions = [[0,1], [1,0], [1,1], [1,-1]];
  const visited = new Set(); 

  for (const stone of boardArray) {
    if (stone.player !== joueur) continue;

    for (const [dr, dc] of directions) {
      // 5 Alignés (EXACTEMENT 5)
      if (checkLine(map, stone.row, stone.col, dr, dc, joueur, 5)) {
          const before = getCell(map, stone.row - dr, stone.col - dc);
          const after = getCell(map, stone.row + dr*5, stone.col + dc*5);

          if (before !== joueur && after !== joueur) {
              const key = `5-${stone.row}-${stone.col}-${dr}-${dc}`;
              if (!visited.has(key)) {
                  menaces.cinq.push({ row: stone.row, col: stone.col });
                  visited.add(key);
              }
          }
      }
      
      checkMenaceQuatre(map, stone.row, stone.col, dr, dc, joueur, menaces, visited);
      checkMenaceTrois(map, stone.row, stone.col, dr, dc, joueur, menaces, visited);
      checkMenaceDeux(map, stone.row, stone.col, dr, dc, joueur, menaces, visited);
    }
  }
  return menaces;
};

const checkLine = (map, r, c, dr, dc, player, length) => {
    for (let i = 0; i < length; i++) {
        if (getCell(map, r + dr*i, c + dc*i) !== player) return false;
    }
    return true;
};

const checkMenaceQuatre = (map, r, c, dr, dc, player, menaces, visited) => {
    if (getCell(map, r - dr, c - dc) === player) return; 

    let stones = 0;
    let empties = 0;
    let emptyPos = null;
    let sequence = "";

    for (let i = 0; i < 5; i++) {
        const cell = getCell(map, r + dr*i, c + dc*i);
        if (cell === player) { stones++; sequence += "X"; }
        else if (cell === null) { 
            empties++; 
            sequence += "."; 
            emptyPos = { row: r + dr*i, col: c + dc*i }; 
        }
        else { sequence += "O"; } 
    }

    if (stones === 4 && empties === 1) {
        const key = `4-${r}-${c}-${dr}-${dc}`;
        if (!visited.has(key)) {
            const menace = { coup: emptyPos, type: sequence, direction: {dr, dc}, origin: {r, c} };
            if (sequence === "X.XXX" || sequence === "XXX.X" || sequence === "XX.XX") {
                menaces.quatre_brise.push(menace);
            } else {
                menaces.quatre_direct.push(menace);
            }
            visited.add(key);
        }
    }
};

const checkMenaceTrois = (map, r, c, dr, dc, player, menaces, visited) => {
    if (getCell(map, r - dr, c - dc) === player) return;

    // Cas 1 : .XXX. (Direct)
    let s1 = getCell(map, r, c);
    let s2 = getCell(map, r + dr, c + dc);
    let s3 = getCell(map, r + 2*dr, c + 2*dc);
    
    if (s1===player && s2===player && s3===player) {
        let before = getCell(map, r - dr, c - dc);
        let after = getCell(map, r + 3*dr, c + 3*dc);
        if (before === null && after === null) {
             const key = `3O-${r}-${c}-${dr}-${dc}`;
             if (!visited.has(key)) {
                 menaces.trois_ouvert.push({ coup: {row: r-dr, col: c-dc}, coup2: {row: r+3*dr, col: c+3*dc} }); 
                 visited.add(key);
             }
        }
    }

    // Cas 2 : Brisés (.X.XX. ou .XX.X.)
    let s4 = getCell(map, r + 3*dr, c + 3*dc);
    if (s1===player && s2===null && s3===player && s4===player) {
        let before = getCell(map, r - dr, c - dc);
        let after = getCell(map, r + 4*dr, c + 4*dc);
        if (before === null && after === null) {
            menaces.trois_brise.push({ coup: {row: r+dr, col: c+dc} });
        }
    }
    if (s1===player && s2===player && s3===null && s4===player) {
        let before = getCell(map, r - dr, c - dc);
        let after = getCell(map, r + 4*dr, c + 4*dc);
        if (before === null && after === null) {
            menaces.trois_brise.push({ coup: {row: r+2*dr, col: c+2*dc} });
        }
    }
};

const checkMenaceDeux = (map, r, c, dr, dc, player, menaces, visited) => {
    if (getCell(map, r - dr, c - dc) === player) return;
    
    let s1 = getCell(map, r, c);
    let s2 = getCell(map, r + dr, c + dc);
    
    if (s1===player && s2===player) {
        let before = getCell(map, r - dr, c - dc);
        let after = getCell(map, r + 2*dr, c + 2*dc);
        if (before === null && after === null) {
            menaces.deux_ouvert.push({ coup: {row: r-dr, col: c-dc} });
        }
    }
    let s3 = getCell(map, r + 2*dr, c + 2*dc);
    if (s1===player && s2===null && s3===player) {
         let before = getCell(map, r - dr, c - dc);
         let after = getCell(map, r + 3*dr, c + 3*dc);
         if (before === null && after === null) {
             menaces.deux_brise.push({ coup: {row: r+dr, col: c+dc} });
         }
    }
};

// --- HEURISTIQUES DÉFENSIVES (Encerclement & Pression) ---

const calculerPression = (map, adversaire) => {
  const pression = new Map();

  for (const [key, player] of map.entries()) {
    if (player !== adversaire) continue;
    const [r, c] = key.split(',').map(Number);

    for (let dr = -3; dr <= 3; dr++) {
      for (let dc = -3; dc <= 3; dc++) {
        const dist = Math.abs(dr) + Math.abs(dc);
        if (dist === 0 || dist > 4) continue;

        const poids = 
          dist === 1 ? 80 : 
          dist === 2 ? 50 : 
          dist === 3 ? 30 : 
          15;

        const k = `${r+dr},${c+dc}`;
        // On ne met de la pression que sur les cases vides (vérifié implicitement par l'utilisation)
        // Mais ici on remplit la map pour toutes les coordonnées
        pression.set(k, (pression.get(k) || 0) + poids);
      }
    }
  }
  return pression;
};

const estEncercle = (map, r, c) => {
  let bloqs = 0;
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    if (getCell(map, r+dr, c+dc) !== null && 
        getCell(map, r-dr, c-dc) !== null) {
      bloqs++;
    }
  }
  return bloqs >= 3;
};

const checkLiaisonAdverse = (map, coup, adversaire) => {
  let connexions = 0;
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    let count = 0;
    // Vérifie devant
    for (let i = 1; i <= 4; i++) {
      if (getCell(map, coup.row + dr*i, coup.col + dc*i) === adversaire) count++;
    }
    if (count >= 2) connexions++;
    
    // Vérifie derrière (optionnel mais logique pour "liaison") - Le snippet utilisateur ne le faisait pas
    // On reste fidèle au snippet pour l'instant pour éviter de trop pénaliser
  }
  return connexions > 0;
};

const findCriticalMove = (boardMatrix, player, count = 4) => {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  const rows = ROWS;
  const cols = COLS;

  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const isEmpty = (r, c) => inBounds(r, c) && boardMatrix[r][c] === null;
  const isPlayer = (r, c) => inBounds(r, c) && boardMatrix[r][c] === player;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (const [dr, dc] of directions) {
        let sequenceLength = 0;
        for (let i = 0; i < count; i++) {
          if (isPlayer(row + dr * i, col + dc * i)) {
            sequenceLength++;
          } else {
            break;
          }
        }

        if (sequenceLength === count) {
          const afterRow = row + dr * count;
          const afterCol = col + dc * count;
          const beforeRow = row - dr;
          const beforeCol = col - dc;

          if (isEmpty(afterRow, afterCol)) {
            console.log(`findCriticalMove: séquence ${count} pour ${player} → jouer après`, { row: afterRow, col: afterCol });
            return { row: afterRow, col: afterCol };
          }

          if (isEmpty(beforeRow, beforeCol)) {
            console.log(`findCriticalMove: séquence ${count} pour ${player} → jouer avant`, { row: beforeRow, col: beforeCol });
            return { row: beforeRow, col: beforeCol };
          }
        }
      }
    }
  }

  return null;
};

const evaluateThreat = (boardMatrix, player) => {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  const rows = ROWS;
  const cols = COLS;

  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const isEmpty = (r, c) => inBounds(r, c) && boardMatrix[r][c] === null;
  const isPlayer = (r, c) => inBounds(r, c) && boardMatrix[r][c] === player;

  const THREAT_SCORES = {
    2: 10,
    3: 100,
    4: 10000,
    5: 1000000,
  };

  let totalScore = 0;
  const counted = new Set();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!isPlayer(row, col)) continue;

      for (const [dr, dc] of directions) {
        let seq = 0;
        let openEnds = 0;

        for (let i = 0; i < 5; i++) {
          if (isPlayer(row + dr * i, col + dc * i)) {
            seq++;
          } else {
            break;
          }
        }

        if (seq < 2) continue;

        const beforeR = row - dr;
        const beforeC = col - dc;
        const afterR = row + dr * seq;
        const afterC = col + dc * seq;

        if (isEmpty(beforeR, beforeC)) openEnds++;
        if (isEmpty(afterR, afterC)) openEnds++;

        const key = `${row},${col},${dr},${dc}`;
        if (counted.has(key)) continue;
        counted.add(key);

        const baseScore = THREAT_SCORES[seq] || 0;
        const openBonus = openEnds === 2 ? 2 : openEnds === 1 ? 1 : 0;

        if (openEnds === 0 && seq < 5) continue;

        totalScore += baseScore * openBonus;
      }
    }
  }

  return totalScore;
};

const shouldAttackOrDefend = (boardMatrix, aiPlayer, humanPlayer) => {
  const aiThreat = evaluateThreat(boardMatrix, aiPlayer);
  const humanThreat = evaluateThreat(boardMatrix, humanPlayer);

  console.log(`IA threat: ${aiThreat} | Human threat: ${humanThreat}`);

  const CRITICAL_THRESHOLD = 10000;
  const ATTACK_THRESHOLD = 5000;
  const DEFENSE_RATIO = 1.5;

  if (humanThreat >= CRITICAL_THRESHOLD) {
    console.log('Mode défense critique');
    return 'defend';
  }

  if (aiThreat >= CRITICAL_THRESHOLD) {
    console.log('Mode attaque gagnante');
    return 'attack';
  }

  if (humanThreat > aiThreat * DEFENSE_RATIO) {
    console.log('Défense prioritaire');
    return 'defend';
  }

  if (aiThreat > humanThreat * DEFENSE_RATIO) {
    console.log('Attaque prioritaire');
    return 'attack';
  }

  console.log('Stratégie équilibrée');
  return 'balanced';
};

const findDoubleThreat = (boardMatrix, player) => {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  const rows = ROWS;
  const cols = COLS;

  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const isEmpty = (r, c) => inBounds(r, c) && boardMatrix[r][c] === null;
  const isPlayer = (r, c) => inBounds(r, c) && boardMatrix[r][c] === player;

  const threats = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (const [dr, dc] of directions) {
        let seq = 0;
        for (let i = 0; i < 4; i++) {
          if (isPlayer(row + dr * i, col + dc * i)) {
            seq++;
          } else {
            break;
          }
        }

        if (seq >= 3) {
          const afterR = row + dr * seq;
          const afterC = col + dc * seq;
          const beforeR = row - dr;
          const beforeC = col - dc;

          if (isEmpty(afterR, afterC) || isEmpty(beforeR, beforeC)) {
            threats.push({ row, col, dr, dc, seq });
          }
        }
      }
    }
  }

  if (threats.length >= 2) {
    console.log(`Double menace pour ${player}`, threats);
    return threats[0];
  }

  return null;
};

// --- SYSTÈME DE SCORING STRATÉGIQUE (v5.0 - PRIORITÉ ABSOLUE) ---

const SCORES = {
  // PRIORITÉ 1: VICTOIRE (Géré par findCriticalMove, mais backup ici)
  WIN: 1000000,
  
  // PRIORITÉ 2: CREATE 4 (Attaque Forcée)
  CREATE_4: 50000,
  
  // PRIORITÉ 3: CREATE DOUBLE (Attaque Gagnante)
  CREATE_DOUBLE: 40000,
  
  // PRIORITÉ 4: BLOCK DOUBLE (Défense Critique)
  BLOCK_DOUBLE: 30000,
  
  // PRIORITÉ 5: BLOCK 3 (Défense Standard)
  BLOCK_OPEN_3: 20000,
  
  // PRIORITÉ 6: CONSTRUCTION
  CREATE_3: 10000,
  BLOCK_2: 5000,
  
  // PRIORITÉ 7: POSITIONNEL
  CENTER: 1000,
  PROXIMITY: 500
};

const getSequenceInfo = (boardMatrix, r, c, player, dr, dc) => {
    let len = 1;
    let blockedEnds = 0;

    // Vers l'avant (direction positive)
    let i = 1;
    while (true) {
        let nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
            blockedEnds++; // Bord du plateau = bloqué
            break;
        }
        if (boardMatrix[nr][nc] !== player) {
            if (boardMatrix[nr][nc] !== null) blockedEnds++; // Pion adverse = bloqué
            break;
        }
        len++; i++;
    }

    // Vers l'arrière (direction négative)
    i = 1;
    while (true) {
        let nr = r - dr * i, nc = c - dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) {
            blockedEnds++;
            break;
        }
        if (boardMatrix[nr][nc] !== player) {
            if (boardMatrix[nr][nc] !== null) blockedEnds++;
            break;
        }
        len++; i++;
    }

    return { len, blockedEnds };
};

const evaluateMoveStrategic = (boardMatrix, row, col, player, adversaire) => {
    let score = 0;
    const directions = [[0,1], [1,0], [1,1], [1,-1]];
    
    // 1. POTENTIEL D'ATTAQUE (Si je joue ici)
    let attack3 = 0;
    let attack4 = 0;
    let attack5 = 0;
    
    for (const [dr, dc] of directions) {
        const { len, blockedEnds } = getSequenceInfo(boardMatrix, row, col, player, dr, dc);
        
        // VICTOIRE (5 ou plus)
        if (len >= 5) {
            attack5++;
        } 
        // CREATE 4 (Doit avoir au moins une extrémité libre pour être une menace)
        else if (len === 4) {
            if (blockedEnds < 2) attack4++; 
        } 
        // CREATE 3 (Doit être ouvert pour être utile)
        else if (len === 3) {
            if (blockedEnds === 0) attack3++; // 3 ouvert (très fort)
            // Note: un 3 semi-ouvert est moins fort, on pourrait le compter différemment
        }
    }
    
    if (attack5 > 0) score += SCORES.WIN;
    if (attack4 > 0) score += SCORES.CREATE_4;
    if (attack3 > 0) score += SCORES.CREATE_3;
    
    // Double menace (Fourchette)
    // On ne compte que les "vraies" menaces (non bloquées totalement)
    if (attack4 >= 2 || (attack4 > 0 && attack3 > 0) || attack3 >= 2) {
        score += SCORES.CREATE_DOUBLE;
    }

    // 2. POTENTIEL DE DÉFENSE (Si l'adversaire jouait ici - Ce que je bloque)
    let block4 = 0; // Bloque un futur 5
    let block3 = 0; // Bloque un futur 4
    let block2 = 0;
    
    for (const [dr, dc] of directions) {
        // On simule si l'adversaire avait joué là
        const { len, blockedEnds } = getSequenceInfo(boardMatrix, row, col, adversaire, dr, dc);
        
        if (len >= 5) {
            score += SCORES.WIN; // Bloque une victoire immédiate
        } 
        else if (len === 4) {
            // Si l'adversaire a 4, il menace de gagner.
            // S'il a 4 bloqués (OXXXXO), ce n'est pas une menace immédiate de 5, mais ça reste dangereux.
            // Mais ici on évalue le coup de BLOCAGE. Si on joue là, on empêche l'adversaire d'utiliser cette case.
            // Si l'adversaire a 3 et joue là -> il obtient 4.
            // Si ce 4 est ouvert (blockedEnds < 2), c'est une menace mortelle.
            if (blockedEnds < 2) block4++;
        }
        else if (len === 3) {
            // L'adversaire a 2, joue là -> obtient 3.
            if (blockedEnds === 0) block3++; // Bloque la création d'un 3 ouvert
        }
        else if (len === 2) {
            if (blockedEnds === 0) block2++;
        }
    }

    if (block4 > 0) score += SCORES.WIN; // ATTENTION: block4 ici signifie "L'adversaire aurait eu 4".
    // Wait.
    // Si l'adversaire a 3 (X X X .), et je joue ., je bloque son 4.
    // getSequenceInfo me dit : si l'adversaire joue ., il a 4.
    // Donc je bloque la CREATION de 4.
    // Ce n'est PAS "Bloquer une victoire" (Bloquer un 5).
    // Bloquer un 5 est géré par "len >= 5".
    
    // Donc:
    // len >= 5 -> Adversaire aurait eu 5 -> C'est un blocage de victoire -> SCORES.WIN.
    // len === 4 -> Adversaire aurait eu 4 -> C'est un blocage de création de 4 -> SCORES.BLOCK_OPEN_3 (car il avait 3 avant).
    // Mais attendez.
    // Si l'adversaire a 4 (X X X X .), et je joue ., je bloque son 5.
    // getSequenceInfo renverra 5 (4+1). -> SCORES.WIN.
    
    // Si l'adversaire a 3 (X X X .), et je joue ., je bloque son 4.
    // getSequenceInfo renverra 4.
    // Si ce 4 est ouvert (blockedEnds < 2), c'est une menace.
    // Donc score += SCORES.BLOCK_OPEN_3 (ou plus fort?).
    // Dans SCORES, BLOCK_OPEN_3 = 20000.
    // CREATE_4 = 50000.
    // Donc CREATE_4 > BLOCK_OPEN_3. C'est ce qu'on veut (Attaque > Défense).
    
    if (block4 > 0) score += SCORES.BLOCK_OPEN_3; // Correction: block4 ici = Adversaire passe de 3 à 4.
    if (block3 > 0) score += SCORES.BLOCK_2; // Adversaire passe de 2 à 3.
    
    // Blocage de fourchette adverse
    if (block4 >= 2 || (block4 > 0 && block3 > 0) || block3 >= 2) {
        score += SCORES.BLOCK_DOUBLE;
    }

    // 3. POSITIONNEL
    // Contrôle du centre
    const centerR = ROWS / 2;
    const centerC = COLS / 2;
    const dist = Math.abs(row - centerR) + Math.abs(col - centerC);
    if (dist < 5) score += SCORES.CENTER;
    else if (dist < 10) score += SCORES.CENTER / 2;

    // Proximité (Voisins)
    let neighbors = 0;
    for (let r = row-2; r <= row+2; r++) {
        for (let c = col-2; c <= col+2; c++) {
             if (r>=0 && r<ROWS && c>=0 && c<COLS && boardMatrix[r][c] !== null) {
                 neighbors++;
             }
        }
    }
    if (neighbors > 0) score += SCORES.PROXIMITY;

    return score;
};

const getBestStrategicMove = (boardMatrix, player, adversaire) => {
    let bestScore = -Infinity;
    let bestMove = null;
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (boardMatrix[r][c] !== null) continue;
            
            // Optimisation : ignorer les cases isolées (sauf si proche centre au début)
            let hasNeighbor = false;
            for (let rr = r-2; rr <= r+2; rr++) {
                for (let cc = c-2; cc <= c+2; cc++) {
                     if (rr>=0 && rr<ROWS && cc>=0 && cc<COLS && boardMatrix[rr][cc] !== null) {
                         hasNeighbor = true; break;
                     }
                }
                if (hasNeighbor) break;
            }
            if (!hasNeighbor && (Math.abs(r - ROWS/2) > 4 || Math.abs(c - COLS/2) > 4)) continue;
            
            const score = evaluateMoveStrategic(boardMatrix, r, c, player, adversaire);
            if (score > bestScore) {
                bestScore = score;
                bestMove = { row: r, col: c, score };
            }
        }
    }
    
    return bestMove;
};

export const calculerCoupIA = (board, difficulte, currentPlayer) => {
  const map = createBoardMap(board);
  const adversaire = currentPlayer === 'black' ? 'white' : 'black';

  const boardMatrix = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );

  for (const stone of board) {
    if (
      stone.row >= 0 &&
      stone.row < ROWS &&
      stone.col >= 0 &&
      stone.col < COLS
    ) {
      boardMatrix[stone.row][stone.col] = stone.player;
    }
  }

  // 1. VICTOIRE IMMÉDIATE (Absolu)
  const winningMove = findCriticalMove(boardMatrix, currentPlayer, 4);
  if (winningMove) {
    console.log('🤖 IA joue case gagnante (4 alignés):', winningMove);
    return winningMove;
  }

  // 2. BLOCAGE CRITIQUE (Absolu)
  const blockingMove = findCriticalMove(boardMatrix, adversaire, 4);
  if (blockingMove) {
    console.log('🛡️ IA bloque le joueur (4 alignés):', blockingMove);
    return blockingMove;
  }

  // 3. STRATÉGIE OFFENSIVE & DÉFENSIVE (Priorité Absolue via Scoring)
  // Gère: Create 4 > Create Double > Block Double > Block 3 > etc.
  const strategicMove = getBestStrategicMove(boardMatrix, currentPlayer, adversaire);
  
  if (strategicMove && strategicMove.score >= SCORES.BLOCK_2) { // Seuil minimal pour un coup stratégique
      console.log(`🧠 Coup Stratégique (Score: ${strategicMove.score}):`, strategicMove);
      return strategicMove;
  }
  
  // 4. FALLBACK (Heuristiques classiques si aucun coup stratégique fort)
  const pionsAdverses = board.filter(p => p.player === adversaire);
  const modeDefense = pionsAdverses.length >= 1;

  const pressionMap = calculerPression(map, adversaire);
  const candidats = obtenirCoupsPertinents(board, map, modeDefense, adversaire);
  
  let profondeur = 3;
  if (difficulte === 'difficile') profondeur = 4;
  if (difficulte === 'moyen') profondeur = 3;
  if (difficulte === 'facile') profondeur = 1;

  const topCandidats = candidats.slice(0, 15);

  const meilleur = minimax(board, map, profondeur, currentPlayer, -Infinity, Infinity, true, topCandidats, pressionMap);
  return meilleur.coup || candidats[0];
};

const minimax = (boardArray, map, profondeur, joueur, alpha, beta, maximisant, candidats, pressionMap) => {
  if (profondeur === 0) {
      return { score: evaluerPosition(boardArray, map, joueur, pressionMap), coup: null };
  }

  let meilleurCoup = null;
  let meilleurScore = maximisant ? -Infinity : Infinity;

  // Pour les appels récursifs, on recalcule les coups pertinents
  // Note: On pourrait passer modeDefense ici aussi, mais le filtrage initial suffit souvent pour orienter l'arbre
  const adversaire = joueur === 'black' ? 'white' : 'black';
  const coups = candidats || obtenirCoupsPertinents(boardArray, map, false, adversaire).slice(0, 10);

  for (const coup of coups) {
      const key = `${coup.row},${coup.col}`;
      map.set(key, maximisant ? joueur : (joueur==='black'?'white':'black'));
      const newStone = { row: coup.row, col: coup.col, player: map.get(key) };
      boardArray.push(newStone);
      
      // Pénalité Anti-Connexion (appliquée au score du coup si c'est l'IA qui joue)
      let penalty = 0;
      if (maximisant) {
        if (checkLiaisonAdverse(map, coup, adversaire)) {
           penalty = -20000;
        }
      }

      const res = minimax(boardArray, map, profondeur - 1, joueur, alpha, beta, !maximisant, null, pressionMap);
      
      const scoreFinal = res.score + penalty;

      boardArray.pop();
      map.delete(key);

      if (maximisant) {
          if (scoreFinal > meilleurScore) {
              meilleurScore = scoreFinal;
              meilleurCoup = coup;
          }
          alpha = Math.max(alpha, meilleurScore);
      } else {
          if (scoreFinal < meilleurScore) {
              meilleurScore = scoreFinal;
              meilleurCoup = coup;
          }
          beta = Math.min(beta, meilleurScore);
      }
      if (beta <= alpha) break;
  }

  return { score: meilleurScore, coup: meilleurCoup };
};

const evaluerPosition = (boardArray, map, joueur, pressionMap) => {
    const adversaire = joueur === 'black' ? 'white' : 'black';
    const menacesIA = scanPatterns(boardArray, map, joueur);
    const menacesAdv = scanPatterns(boardArray, map, adversaire);

    // VICTOIRE/DÉFAITE
    if (menacesIA.cinq.length > 0) return 10000000;
    if (menacesAdv.cinq.length > 0) return -10000000;

    let score = 0;

    // --- BAREME v3.1 ---

    // 1. Menaces Directes
    score += menacesIA.quatre_direct.length * 100000;
    score += menacesIA.quatre_brise.length * 80000;
    score += menacesIA.trois_ouvert.length * 10000;
    score += menacesIA.trois_brise.length * 5000;
    score += menacesIA.deux_ouvert.length * 1000;

    // 2. Défense (Pénalités augmentées)
    score -= menacesAdv.quatre_direct.length * 200000; 
    score -= menacesAdv.quatre_brise.length * 150000;
    score -= menacesAdv.trois_ouvert.length * 25000; 
    score -= menacesAdv.trois_brise.length * 15000;
    score -= menacesAdv.deux_ouvert.length * 2000;

    // 3. Pression (Heatmap)
    // On ajoute le score de pression pour chaque pion de l'IA placé sur une zone chaude
    if (pressionMap) {
        for (const stone of boardArray) {
            if (stone.player === joueur) {
                const k = `${stone.row},${stone.col}`;
                score += (pressionMap.get(k) || 0);
            }
        }
    }

    // 4. Encerclement (Caging)
    // On vérifie si l'adversaire est encerclé
    for (const stone of boardArray) {
        if (stone.player === adversaire) {
            if (estEncercle(map, stone.row, stone.col)) {
                score += 15000;
            }
        }
    }

    return score;
};

const obtenirCoupsPertinents = (boardArray, map, modeDefense = false, adversaire = null) => {
    const coups = new Set();
    
    if (boardArray.length === 0) return [{row: 9, col: 6}];

    for (const stone of boardArray) {
        // Rayon de 2 cases
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr===0 && dc===0) continue;
                const r = stone.row + dr;
                const c = stone.col + dc;
                if (r>=0 && r<ROWS && c>=0 && c<COLS && !map.has(`${r},${c}`)) {
                    coups.add(`${r},${c}`);
                }
            }
        }
    }
    
    return Array.from(coups).map(s => {
        const [r, c] = s.split(',').map(Number);
        return { row: r, col: c };
    });
};
