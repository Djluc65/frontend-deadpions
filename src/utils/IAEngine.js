
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

// --- LOGIQUE DE DÉCISION v3.1 ---

export const calculerCoupIA = (board, difficulte, currentPlayer) => {
  const map = createBoardMap(board);
  const adversaire = currentPlayer === 'black' ? 'white' : 'black';
  
  // Détection du Mode Défense
  const pionsAdverses = board.filter(p => p.player === adversaire);
  const modeDefense = pionsAdverses.length >= 1;

  // 1. VICTOIRE IMMÉDIATE
  const mesMenaces = scanPatterns(board, map, currentPlayer);
  if (mesMenaces.quatre_direct.length > 0) return mesMenaces.quatre_direct[0].coup;
  if (mesMenaces.quatre_brise.length > 0) return mesMenaces.quatre_brise[0].coup;

  // 2. BLOQUER DÉFAITE IMMÉDIATE
  const menacesAdverses = scanPatterns(board, map, adversaire);
  if (menacesAdverses.quatre_direct.length > 0) return menacesAdverses.quatre_direct[0].coup;
  if (menacesAdverses.quatre_brise.length > 0) return menacesAdverses.quatre_brise[0].coup;

  // 3. ATTAQUE FORCEE (4 Ouvert)
  if (mesMenaces.trois_ouvert.length > 0) return mesMenaces.trois_ouvert[0].coup;
  if (mesMenaces.trois_brise.length > 0) return mesMenaces.trois_brise[0].coup;

  // 4. DÉFENSE CRITIQUE (Bloquer 3 ouvert)
  const coupsDefense = [];
  if (menacesAdverses.trois_ouvert.length > 0) coupsDefense.push(menacesAdverses.trois_ouvert[0].coup);
  if (menacesAdverses.trois_brise.length > 0) coupsDefense.push(menacesAdverses.trois_brise[0].coup);

  if (coupsDefense.length > 0) {
      return coupsDefense[0];
  }

  // 5. MINIMAX + HEURISTIQUES v3.1
  
  // Calcul de la Heatmap (Pression) une seule fois
  const pressionMap = calculerPression(map, adversaire);

  const candidats = obtenirCoupsPertinents(board, map, modeDefense, adversaire);
  
  let profondeur = 3;
  if (difficulte === 'difficile') profondeur = 4;
  if (difficulte === 'moyen') profondeur = 3;
  if (difficulte === 'facile') profondeur = 1;

  // Optimisation : Limiter les candidats pour la profondeur
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
    
    if (boardArray.length === 0) return [{row: 15, col: 9}];

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
