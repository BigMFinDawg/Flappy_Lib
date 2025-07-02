const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElem = document.getElementById('score');
const messageElem = document.getElementById('message');

// Load images
const birdImg = new Image();
birdImg.src = 'face.png';
const pipeImg = new Image();
pipeImg.src = 'reign_can.png';

// Game constants
const WIDTH = 400;
const HEIGHT = 600;
const GROUND_HEIGHT = 80;
const BIRD_SIZE = 64;
const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const PIPE_WIDTH = 90;
const PIPE_GAP = 160;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 90; // frames
const PIPE_HEIGHT = 200; // for can image
const BIRD_HITBOX_RATIO = 0.5; // Slimmer hitbox for more accurate collision

// Game state
let bird = null;
let pipes = [];
let score = 0;
let highScore = 0;
let frame = 0;
let gameState = 'start';

// Add scroll offsets for clouds and ground
let cloudOffset = 0;
let groundOffset = 0;
const CLOUD_SPEED = 0.3;
const GROUND_SPEED = PIPE_SPEED;

function submitScore(name, score) {
  fetch("https://script.google.com/macros/s/AKfycbxNod3WZeFjU-7Qc8NArmhWZkrf9qAmS5J9fubDJRA7qO1hYRGxd2rU49_kfYuswVkz5Q/exec", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `name=${encodeURIComponent(name)}&score=${encodeURIComponent(score)}`
  })
  .then(response => response.text())
  .then(data => console.log("Score submitted:", data))
  .catch(error => console.error("Error submitting score:", error));
}

function resetGame() {
  bird = {
    x: 80,
    y: HEIGHT / 2,
    vy: 0,
    size: BIRD_SIZE
  };
  pipes = [];
  score = 0;
  frame = 0;
  spawnPipe();
}

function spawnPipe() {
  const minGapY = 0;
  const maxGapY = HEIGHT - PIPE_GAP - GROUND_HEIGHT;
  const gapY = Math.floor(Math.random() * (maxGapY - minGapY + 1)) + minGapY;
  pipes.push({
    x: WIDTH,
    gapY: gapY
  });
}

function drawBackground() {
  // Pixel sky
  ctx.fillStyle = '#6ec6f7';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Scrolling pixel clouds
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#fff';
  const cloudPatterns = [
    {w: 60, h: 20, y: 80},
    {w: 40, h: 16, y: 50},
    {w: 60, h: 20, y: 120}
  ];
  for (let i = 0; i < 3; i++) {
    let x = (60 + i * 120 - cloudOffset) % (WIDTH + 120);
    if (x < -cloudPatterns[i % cloudPatterns.length].w) x += WIDTH + 120;
    ctx.fillRect(x, cloudPatterns[i % cloudPatterns.length].y, cloudPatterns[i % cloudPatterns.length].w, cloudPatterns[i % cloudPatterns.length].h);
  }
  ctx.globalAlpha = 1.0;
  ctx.restore();

  // Scrolling pixel ground
  ctx.save();
  let groundTileWidth = 40;
  let groundTiles = Math.ceil(WIDTH / groundTileWidth) + 2;
  for (let i = 0; i < groundTiles; i++) {
    let x = (i * groundTileWidth - groundOffset) % (WIDTH + groundTileWidth);
    if (x < -groundTileWidth) x += WIDTH + groundTileWidth;
    // Ground base
    ctx.fillStyle = '#b97a56';
    ctx.fillRect(x, HEIGHT - GROUND_HEIGHT, groundTileWidth, GROUND_HEIGHT);
    // Grass
    ctx.fillStyle = '#6ab150';
    ctx.fillRect(x, HEIGHT - GROUND_HEIGHT, groundTileWidth, 8);
    // Dirt
    ctx.fillStyle = '#8d5a36';
    ctx.fillRect(x, HEIGHT - GROUND_HEIGHT + 16, groundTileWidth, 8);
  }
  ctx.restore();
}

function drawBird() {
  if (!bird) return;
  if (birdImg.complete && birdImg.naturalWidth > 0) {
    ctx.save();
    ctx.drawImage(
      birdImg,
      bird.x - bird.size / 2,
      bird.y - bird.size / 2,
      bird.size,
      bird.size
    );
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = '#ffeb3b';
    ctx.strokeStyle = '#bfa600';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawPipes() {
  pipes.forEach(pipe => {
    const topEnd = pipe.gapY;
    const bottomStart = pipe.gapY + PIPE_GAP;

    // Draw top pipe — cans from just above the gap up to the top
    for (let y = topEnd - PIPE_HEIGHT; y >= -PIPE_HEIGHT; y -= PIPE_HEIGHT) {
      if (pipeImg.complete) {
        ctx.save();
        ctx.translate(pipe.x + PIPE_WIDTH / 2, y + PIPE_HEIGHT / 2);
        ctx.rotate(Math.PI); // flip vertically for top pipe
        ctx.drawImage(pipeImg, -PIPE_WIDTH / 2, -PIPE_HEIGHT / 2, PIPE_WIDTH, PIPE_HEIGHT);
        ctx.restore();
      }
    }

    // Draw bottom pipe — cans from just below the gap to the ground
    for (let y = bottomStart; y <= canvas.height - GROUND_HEIGHT; y += PIPE_HEIGHT) {
      if (pipeImg.complete) {
        ctx.drawImage(pipeImg, pipe.x, y, PIPE_WIDTH, PIPE_HEIGHT);
      }
    }
  });
}

function drawPixelSky() {
  // Draw sky gradient (pixelated)
  const skyColors = ['#6ec6f7', '#8fd3ff', '#b3e0ff', '#e0f7fa'];
  const bandHeight = Math.floor((HEIGHT - GROUND_HEIGHT) / skyColors.length);
  for (let i = 0; i < skyColors.length; i++) {
    ctx.fillStyle = skyColors[i];
    ctx.fillRect(0, i * bandHeight, WIDTH, bandHeight);
  }
  // Draw pixel clouds
  const clouds = [
    {x: 60, y: 80, w: 60, h: 20},
    {x: 200, y: 50, w: 80, h: 24},
    {x: 300, y: 120, w: 50, h: 18},
    {x: 120, y: 160, w: 70, h: 22}
  ];
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#fff';
  clouds.forEach(cloud => {
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(cloud.x + i * 12, cloud.y, 12, cloud.h);
    }
  });
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

function drawPixelGround() {
  // Draw ground base
  ctx.fillStyle = '#b97a56';
  ctx.fillRect(0, HEIGHT - GROUND_HEIGHT, WIDTH, GROUND_HEIGHT);
  // Draw pixel grass
  ctx.fillStyle = '#6ab150';
  for (let x = 0; x < WIDTH; x += 8) {
    ctx.fillRect(x, HEIGHT - GROUND_HEIGHT, 8, 8);
  }
  // Draw pixel dirt
  ctx.fillStyle = '#8d5a36';
  for (let x = 0; x < WIDTH; x += 8) {
    ctx.fillRect(x, HEIGHT - GROUND_HEIGHT + 16, 8, 8);
  }
}

function drawPixelOverlayBorder() {
  // Draw a pixel art border around the overlay
  const border = 8;
  overlay.style.border = `${border}px solid #222`;
  overlay.style.boxShadow = '0 0 0 4px #fff, 0 0 0 8px #222';
  overlay.style.borderRadius = '0';
  overlay.style.background = 'rgba(0,0,0,0.7)';
}

function clearPixelOverlayBorder() {
  overlay.style.border = '';
  overlay.style.boxShadow = '';
  overlay.style.borderRadius = '';
  overlay.style.background = 'rgba(0,0,0,0.5)';
}

function drawScore() {
  ctx.save();
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(score, WIDTH / 2, 80);
  ctx.restore();
}

function update() {
  if (gameState !== 'playing') return;
  frame++;
  // Animate background
  cloudOffset += CLOUD_SPEED;
  if (cloudOffset > WIDTH + 120) cloudOffset = 0;
  groundOffset += GROUND_SPEED;
  if (groundOffset > 40) groundOffset = 0;
  // Bird physics
  bird.vy += GRAVITY;
  bird.y += bird.vy;

  // Pipes
  if (frame % PIPE_INTERVAL === 0) {
    spawnPipe();
  }
  pipes.forEach(pipe => {
    pipe.x -= PIPE_SPEED;
  });
  // Remove off-screen pipes
  if (pipes.length && pipes[0].x + PIPE_WIDTH < 0) {
    pipes.shift();
    score++;
    scoreElem.textContent = score;
    if (score > (highScore || 0)) highScore = score;
  }

  // Collision detection (use smaller hitbox)
  const hitboxRadius = (bird.size / 2) * BIRD_HITBOX_RATIO;
  pipes.forEach(pipe => {
    // Check if bird is within pipe's x-range
    if (
      bird.x + hitboxRadius > pipe.x &&
      bird.x - hitboxRadius < pipe.x + PIPE_WIDTH &&
      (
        bird.y - hitboxRadius < pipe.gapY ||
        bird.y + hitboxRadius > pipe.gapY + PIPE_GAP
      )
    ) {
      gameOver();
    }
  });
  // Ground or ceiling
  if (bird.y + hitboxRadius > HEIGHT - GROUND_HEIGHT || bird.y - hitboxRadius < 0) {
    gameOver();
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawPipes();
  drawPixelGround();
  drawBird();
  drawScore();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function flap() {
  if (gameState === 'playing') {
    bird.vy = FLAP_STRENGTH;
  } else if (gameState === 'start' || gameState === 'gameover') {
    startGame();
  }
}

function startGame() {
  // Remove high scores box if present
  const prev = document.getElementById('highScoresDiv');
  if (prev) prev.remove();
  resetGame();
  gameState = 'playing';
  messageElem.style.display = 'none';
  scoreElem.textContent = '0';
}

function fetchHighScoresAndDisplay() {
  if (gameState !== 'gameover') return;
  // Remove any previous high scores display
  const prev = document.getElementById("highScoresDiv");
  if (prev) prev.remove();
  fetch("https://script.google.com/macros/s/AKfycbxNod3WZeFjU-7Qc8NArmhWZkrf9qAmS5J9fubDJRA7qO1hYRGxd2rU49_kfYuswVkz5Q/exec")
    .then(response => response.json())
    .then(data => {
      // Only display if still game over
      if (gameState !== 'gameover') return;
      // Format top 5 scores
      let display = "🏆 High Scores:\n";
      data.slice(0, 5).forEach((row, index) => {
        display += `${index + 1}. ${row[0]} - ${row[1]}\n`;
      });
      // Display below the existing "LIBERAL" game over box
      const highScoresDiv = document.createElement("div");
      highScoresDiv.id = "highScoresDiv";
      highScoresDiv.style.position = "absolute";
      highScoresDiv.style.top = "65%";
      highScoresDiv.style.left = "50%";
      highScoresDiv.style.transform = "translate(-50%, 0)";
      highScoresDiv.style.color = "white";
      highScoresDiv.style.font = "bold 16px monospace";
      highScoresDiv.style.textAlign = "center";
      highScoresDiv.style.textShadow = "2px 2px black";
      highScoresDiv.innerText = display;
      document.body.appendChild(highScoresDiv);
    })
    .catch(error => {
      console.error("Error fetching high scores:", error);
    });
}

function gameOver() {
  gameState = 'gameover';
  messageElem.innerHTML = `<div style='font-size:2em;font-weight:bold;'>LIBERAL</div><div style='font-size:1em;margin-top:1em;'>Press Space, Enter, or Tap to Restart</div>`;
  messageElem.style.display = 'block';
  // Prompt for initials and submit score if score > 0
  if (score > 0) {
    const playerName = prompt("Game Over! Enter your initials (3 letters):");
    if (playerName) {
      submitScore(playerName.substring(0, 3).toUpperCase(), score);
    }
  }
  fetchHighScoresAndDisplay();
}

function showStartScreen() {
  messageElem.innerHTML = `<div style='font-size:2em;font-weight:bold;'>Flappy Liberal</div><div style='font-size:1em;margin-top:1em;'>Press Space, Enter, or Tap to Start</div>`;
  messageElem.style.display = 'block';
  scoreElem.textContent = '0';
}

// Controls
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    flap();
  }
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  flap();
});
canvas.addEventListener('mousedown', e => {
  e.preventDefault();
  flap();
});

// Set up canvas size
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.focus();

// Start
showStartScreen();
loop();

// Remove responsive canvas resizing
canvas.width = 400;
canvas.height = 600; 
