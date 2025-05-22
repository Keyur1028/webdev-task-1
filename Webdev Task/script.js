let redTime = 120;
let blueTime = 120;
let thirtyTime = 30;
const redEl = document.getElementById('redtime');
const blueEl = document.getElementById('bluetime');
const countdownEl = document.getElementById('countdown');

let redTimer = null;
let blueTimer = null;
let thirtyTimer = null;
let paused = false;

// Game state
let currentPlayer = 'red'; // 'red' or 'blue'
let gamePhase = 'placement'; // 'placement' or 'movement'
let redScore = 0;
let blueScore = 0;
let placedPieces = {
  red: [],
  blue: []
};
let unlockedCircuits = [3]; // Start with outermost circuit (3) unlocked
const MAX_TITANS_PER_PLAYER = 4;

// Edge connections and weights
const edges = {
  // Outer hexagon edges (circuit 3)
  '13-14': 2, '14-15': 2, '15-16': 2, '16-17': 2, '17-18': 2, '18-13': 2,
  // Middle hexagon edges (circuit 2)
  '7-8': 4, '8-9': 4, '9-10': 4, '10-11': 4, '11-12': 4, '12-7': 4,
  // Inner hexagon edges (circuit 1)
  '1-2': 8, '2-3': 8, '3-4': 9, '4-5': 8, '5-6': 8, '6-1': 9,
  // Radial edges
  '1-7': 1, '5-11': 1,'7-13': 1, '8-14':1, '10-16': 1, '12-18': 1
};

// Adjacency map for quick lookup
const adjacencyMap = {
  1: [2, 6, 7],
  2: [1, 3],
  3: [2, 4, 9],
  4: [3, 5],
  5: [4, 6, 11],
  6: [1, 5],
  7: [1, 8, 13],
  8: [ 7, 9, 14],
  9: [3, 8, 10],
  10: [ 9, 11, 16],
  11: [5, 10, 12],
  12: [ 11, 7, 18],
  13: [7, 14, 18],
  14: [8,13, 15],
  15: [9, 14, 16],
  16: [10, 15, 17],
  17: [11, 16, 18],
  18: [12, 13, 17]
};

// Initialize game
function initGame() {
  // Add click handlers to all circles
  for (let i = 1; i <= 18; i++) {
    const circle = document.getElementById(`circle${i}`);
    circle.addEventListener('click', () => handleCircleClick(i));
  }
  updateUI();
}

function handleCircleClick(circleId) {
  if (paused) return;
  
  const circle = document.getElementById(`circle${circleId}`);
  const circuit = getCircuitForCircle(circleId);
  
  if (gamePhase === 'placement') {
    handlePlacement(circleId, circuit);
  } else {
    handleMovement(circleId);
  }
}

function handlePlacement(circleId, circuit) {
  if (!unlockedCircuits.includes(circuit)) return;
  
  const circle = document.getElementById(`circle${circleId}`);
  if (circle.classList.contains('red') || circle.classList.contains('blue')) return;
  
  // Check if player has reached max titans
  if (placedPieces[currentPlayer].length >= MAX_TITANS_PER_PLAYER) {
    alert(`${currentPlayer.toUpperCase()} player has already placed their maximum of ${MAX_TITANS_PER_PLAYER} titans!`);
    return;
  }
  
  // Place piece
  circle.classList.add(currentPlayer);
  placedPieces[currentPlayer].push(circleId);
  
  // Check if circuit is full
  if (isCircuitFull(circuit)) {
    unlockedCircuits.push(circuit - 1);
  }
  
  // Check if both players have placed their titans
  if (placedPieces.red.length === MAX_TITANS_PER_PLAYER && 
      placedPieces.blue.length === MAX_TITANS_PER_PLAYER) {
    gamePhase = 'movement';
    alert('Placement phase complete! Movement phase begins.');
  }
  
  // Check for game end conditions after each placement
  if (!checkGameEnd()) {
    switchPlayer();
  }
  updateUI();
}

function handleMovement(circleId) {
  const circle = document.getElementById(`circle${circleId}`);
  const selectedPiece = document.querySelector('.selected');
  
  if (selectedPiece) {
    // If clicking on an empty adjacent node
    if (!circle.classList.contains('red') && !circle.classList.contains('blue')) {
      const fromId = parseInt(selectedPiece.id.replace('circle', ''));
      if (isAdjacent(fromId, circleId)) {
        movePiece(fromId, circleId);
        checkSurroundedPieces();
        updateScores();
        
        // Check for game end conditions after each move
        if (!checkGameEnd()) {
          switchPlayer();
        }
      } else {
        alert('Invalid move! You can only move to adjacent nodes.');
      }
    }
    selectedPiece.classList.remove('selected');
  } else if (circle.classList.contains(currentPlayer)) {
    // Select piece for movement
    circle.classList.add('selected');
  }
}

function movePiece(fromId, toId) {
  const fromCircle = document.getElementById(`circle${fromId}`);
  const toCircle = document.getElementById(`circle${toId}`);
  
  toCircle.classList.add(currentPlayer);
  fromCircle.classList.remove(currentPlayer);
  
  // Update placedPieces
  const index = placedPieces[currentPlayer].indexOf(fromId);
  placedPieces[currentPlayer][index] = toId;
}

function isAdjacent(fromId, toId) {
  // Check if the nodes are directly connected in the adjacency map
  return adjacencyMap[fromId].includes(toId);
}

function checkSurroundedPieces() {
  const opponent = currentPlayer === 'red' ? 'blue' : 'red';
  const piecesToRemove = [];
  
  placedPieces[opponent].forEach(pieceId => {
    const adjacentNodes = getAdjacentNodes(pieceId);
    if (adjacentNodes.every(nodeId => {
      const node = document.getElementById(`circle${nodeId}`);
      return node.classList.contains(currentPlayer);
    })) {
      piecesToRemove.push(pieceId);
    }
  });
  
  // Remove surrounded pieces
  piecesToRemove.forEach(pieceId => {
    const circle = document.getElementById(`circle${pieceId}`);
    circle.classList.remove(opponent);
    placedPieces[opponent] = placedPieces[opponent].filter(id => id !== pieceId);
  });
}

function updateScores() {
  redScore = 0;
  blueScore = 0;
  
  Object.entries(edges).forEach(([edge, weight]) => {
    const [node1, node2] = edge.split('-').map(Number);
    const circle1 = document.getElementById(`circle${node1}`);
    const circle2 = document.getElementById(`circle${node2}`);
    
    if (circle1.classList.contains('red') && circle2.classList.contains('red')) {
      redScore += weight;
    } else if (circle1.classList.contains('blue') && circle2.classList.contains('blue')) {
      blueScore += weight;
    }
  });
}

function getCircuitForCircle(circleId) {
  if (circleId <= 6) return 1;
  if (circleId <= 12) return 2;
  return 3;
}

function isCircuitFull(circuit) {
  const circlesInCircuit = Array.from(document.querySelectorAll('.circle'))
    .filter(circle => {
      const id = parseInt(circle.id.replace('circle', ''));
      return getCircuitForCircle(id) === circuit;
    });
  
  return circlesInCircuit.every(circle => 
    circle.classList.contains('red') || circle.classList.contains('blue')
  );
}

function getAdjacentNodes(nodeId) {
  return adjacencyMap[nodeId] || [];
}

function switchPlayer() {
  currentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
  startTimers(); // Reset 30s timer and start appropriate player timer
  updateUI();
}

function updateUI() {
  // Update score display
  document.getElementById('redScore').textContent = redScore;
  document.getElementById('blueScore').textContent = blueScore;
  
  // Update current player indicator
  document.querySelectorAll('.player-indicator').forEach(indicator => {
    indicator.classList.remove('active');
  });
  document.getElementById(`${currentPlayer}Indicator`).classList.add('active');
  
  // Update phase indicator
  const phaseIndicator = document.getElementById('phaseIndicator');
  if (phaseIndicator) {
    phaseIndicator.textContent = `Phase: ${gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}`;
  }
}

// Timer functions
function startTimers() {
  // Clear any existing timers
  clearInterval(redTimer); redTimer = null;
  clearInterval(blueTimer); blueTimer = null;
  clearInterval(thirtyTimer); thirtyTimer = null;
  
  // Reset 30-second timer
  thirtyTime = 30;
  countdownEl.textContent = thirtyTime;
  
  // Start appropriate player timer
  if (currentPlayer === 'red') {
    redTimer = setInterval(() => {
      if (redTime > 0 && !paused) {
        redTime--;
        redEl.textContent = redTime;
        if (redTime === 0) {
          endGame('Red player\'s time has run out!');
        }
      }
    }, 1000);
  } else {
    blueTimer = setInterval(() => {
      if (blueTime > 0 && !paused) {
        blueTime--;
        blueEl.textContent = blueTime;
        if (blueTime === 0) {
          endGame('Blue player\'s time has run out!');
        }
      }
    }, 1000);
  }
  
  // Start 30-second timer
  thirtyTimer = setInterval(() => {
    if (thirtyTime > 0 && !paused) {
      thirtyTime--;
      countdownEl.textContent = thirtyTime;
      if (thirtyTime === 0) {
        // Force switch player when 30 seconds are up
        switchPlayer();
        startTimers(); // This will reset 30s timer and start other player's timer
      }
    }
  }, 1000);
}

function Pause() {
  clearInterval(redTimer); redTimer = null;
  clearInterval(blueTimer); blueTimer = null;
  clearInterval(thirtyTimer); thirtyTimer = null;
  paused = true;
}

function Resume() {
  if (paused) {
    startTimers();
    paused = false;
  }
}

function Redo() {
  clearInterval(redTimer); redTimer = null;
  clearInterval(blueTimer); blueTimer = null;
  clearInterval(thirtyTimer); thirtyTimer = null;
  redTime = 120;
  blueTime = 120;
  thirtyTime = 30;
  redEl.textContent = redTime;
  blueEl.textContent = blueTime;
  countdownEl.textContent = thirtyTime;
  paused = false;
  
  // Reset game state
  currentPlayer = 'red';
  gamePhase = 'placement';
  redScore = 0;
  blueScore = 0;
  placedPieces = { red: [], blue: [] };
  unlockedCircuits = [3];
  
  // Clear all pieces
  document.querySelectorAll('.circle').forEach(circle => {
    circle.classList.remove('red', 'blue', 'selected');
  });
  
  updateUI();
  startTimers();
}

function checkGameEnd() {
  // Check if inner hexagon (ring 0) is completely filled
  const innerHexagonNodes = [1, 2, 3, 4, 5, 6];
  const isInnerHexagonFull = innerHexagonNodes.every(nodeId => {
    const circle = document.getElementById(`circle${nodeId}`);
    return circle.classList.contains('red') || circle.classList.contains('blue');
  });

  if (isInnerHexagonFull) {
    endGame('Inner hexagon is completely filled!');
    return true;
  }

  return false;
}

function endGame(reason) {
  Pause();
  updateScores(); // Make sure scores are up to date
  
  let message = 'Game Over!\n';
  if (reason) {
    message += `Reason: ${reason}\n`;
  }
  
  if (redScore > blueScore) {
    message += `Red player wins with ${redScore} points!\n`;
  } else if (blueScore > redScore) {
    message += `Blue player wins with ${blueScore} points!\n`;
  } else {
    message += `It's a tie! Both players have ${redScore} points.\n`;
  }
  
  message += `\nFinal Scores:\nRed: ${redScore}\nBlue: ${blueScore}`;
  alert(message);
}

// Initialize game on load
window.onload = function() {
  initGame();
  startTimers();
};

  
