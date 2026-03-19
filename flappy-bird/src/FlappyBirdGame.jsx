import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const GROUND_HEIGHT = 100;
const BIRD_SIZE = 40;
const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const BIRD_X = 80;
const BIRD_START_Y = GAME_HEIGHT / 2 - BIRD_SIZE / 2;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_INTERVAL = 90;
const PIPE_SPEED = 2.5;

function getRandomPipeY() {
  const min = 120;
  const max = GAME_HEIGHT - GROUND_HEIGHT - 120;
  return Math.floor(Math.random() * (max - min)) + min;
}

function checkCollision(birdRect, pipeRect) {
  return (
    birdRect.x < pipeRect.x + pipeRect.width &&
    birdRect.x + birdRect.width > pipeRect.x &&
    birdRect.y < pipeRect.y + pipeRect.height &&
    birdRect.y + birdRect.height > pipeRect.y
  );
}

const FlappyBirdGame = () => {
  // 'idle' = waiting for first input, 'playing' = active, 'gameover' = dead
  const [gameState, setGameState] = useState('idle');
  const [birdY, setBirdY] = useState(BIRD_START_Y);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [flapping, setFlapping] = useState(false);

  const birdYRef = useRef(BIRD_START_Y);
  const birdVelRef = useRef(0);
  const pipesRef = useRef([]);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const rafRef = useRef();
  const gameStateRef = useRef('idle');

  // Keep gameStateRef in sync
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Game loop — runs only when gameState === 'playing'
  useEffect(() => {
    if (gameState !== 'playing') return;

    const animate = () => {
      frameRef.current++;

      // Bird physics
      birdVelRef.current += GRAVITY;
      birdYRef.current += birdVelRef.current;

      // Clamp to ceiling
      if (birdYRef.current < 0) {
        birdYRef.current = 0;
        birdVelRef.current = 0;
      }

      // Pipes
      pipesRef.current = pipesRef.current
        .map(p => ({ ...p, x: p.x - PIPE_SPEED }))
        .filter(p => p.x + PIPE_WIDTH > 0);

      // Score: count each pipe once when it passes behind the bird
      for (const pipe of pipesRef.current) {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          scoreRef.current += 1;
        }
      }

      if (frameRef.current % PIPE_INTERVAL === 0) {
        pipesRef.current.push({ x: GAME_WIDTH, gapY: getRandomPipeY(), passed: false });
      }

      // Collision detection
      const birdRect = { x: BIRD_X, y: birdYRef.current, width: BIRD_SIZE, height: BIRD_SIZE };
      let collided = false;

      // Ground
      if (birdYRef.current >= GAME_HEIGHT - GROUND_HEIGHT - BIRD_SIZE) {
        birdYRef.current = GAME_HEIGHT - GROUND_HEIGHT - BIRD_SIZE;
        collided = true;
      }

      // Pipes
      for (const pipe of pipesRef.current) {
        const topRect = { x: pipe.x, y: 0, width: PIPE_WIDTH, height: pipe.gapY - PIPE_GAP / 2 };
        const bottomRect = { x: pipe.x, y: pipe.gapY + PIPE_GAP / 2, width: PIPE_WIDTH, height: GAME_HEIGHT - GROUND_HEIGHT - (pipe.gapY + PIPE_GAP / 2) };
        if (checkCollision(birdRect, topRect) || checkCollision(birdRect, bottomRect)) {
          collided = true;
          break;
        }
      }

      // Push to React state for rendering
      setBirdY(birdYRef.current);
      setBirdVelocity(birdVelRef.current);
      setPipes([...pipesRef.current]);
      setScore(scoreRef.current);

      if (collided) {
        setGameState('gameover');
      } else {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  // Handle flap / start
  const handleFlap = useCallback(() => {
    if (gameStateRef.current === 'idle') {
      // First press — start the game
      birdYRef.current = BIRD_START_Y;
      birdVelRef.current = FLAP_STRENGTH;
      pipesRef.current = [];
      scoreRef.current = 0;
      frameRef.current = 0;
      setBirdY(BIRD_START_Y);
      setBirdVelocity(FLAP_STRENGTH);
      setPipes([]);
      setScore(0);
      setGameState('playing');
    } else if (gameStateRef.current === 'playing') {
      birdVelRef.current = FLAP_STRENGTH;
    }
    setFlapping(true);
    setTimeout(() => setFlapping(false), 120);
  }, []);

  // Keyboard listener — never stale thanks to useCallback + ref
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleFlap]);

  return (
    <div
      style={{
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        background: '#70c5ce',
        position: 'relative',
        overflow: 'hidden',
        margin: '40px auto',
        borderRadius: 16,
        boxShadow: '0 4px 24px #0003',
        userSelect: 'none',
        cursor: 'pointer',
      }}
      onClick={handleFlap}
      tabIndex={0}
    >
      {/* Ground */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: GROUND_HEIGHT,
          background: '#ded895',
          borderTop: '4px solid #bcae6e',
        }}
      />
      {/* Bird */}
      {/* Score */}
      <div style={{ position: 'absolute', left: 12, top: 12, zIndex: 5, color: '#fff', fontWeight: 'bold', fontSize: 28, textShadow: '2px 2px 8px #0007' }}>
        {score}
      </div>
      <div
        style={{
          position: 'absolute',
          left: BIRD_X,
          top: birdY,
          width: flapping ? BIRD_SIZE * 0.92 : BIRD_SIZE,
          height: flapping ? BIRD_SIZE * 0.92 : BIRD_SIZE,
          background: 'radial-gradient(circle at 60% 40%, #ffe066 70%, #e1a800 100%)',
          borderRadius: '50%',
          border: '2px solid #bcae6e',
          boxShadow: '2px 4px 8px #0004',
          zIndex: 2,
          transform: `rotate(${flapping ? -30 : Math.max(Math.min(birdVelocity * 2, 45), -45)}deg)`,
          transition: 'transform 0.08s linear, width 0.08s, height 0.08s',
        }}
      >
        <div style={{ width: 10, height: 10, background: '#222', borderRadius: '50%', position: 'absolute', left: 28, top: 12 }} />
        <div style={{ width: 12, height: 8, background: '#ffb700', clipPath: 'polygon(0 0, 100% 50%, 0 100%)', position: 'absolute', left: 38, top: 18 }} />
      </div>
      {/* Pipes */}
      {pipes.map((pipe, idx) => (
        <React.Fragment key={idx}>
          <div style={{ position: 'absolute', left: pipe.x, top: 0, width: PIPE_WIDTH, height: pipe.gapY - PIPE_GAP / 2, background: '#5ec639', border: '2px solid #38761d', borderRadius: '8px 8px 24px 24px', zIndex: 1 }} />
          <div style={{ position: 'absolute', left: pipe.x, top: pipe.gapY + PIPE_GAP / 2, width: PIPE_WIDTH, height: GAME_HEIGHT - GROUND_HEIGHT - (pipe.gapY + PIPE_GAP / 2), background: '#5ec639', border: '2px solid #38761d', borderRadius: '24px 24px 8px 8px', zIndex: 1 }} />
        </React.Fragment>
      ))}
      {/* Idle message */}
      {gameState === 'idle' && (
        <h2 style={{ color: '#fff', textAlign: 'center', marginTop: '40%', textShadow: '2px 2px 8px #0007' }}>
          Press Space to Start
        </h2>
      )}
      {/* Game Over message */}
      {gameState === 'gameover' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0005', zIndex: 10 }}>
          <h2 style={{ color: '#fff', textShadow: '2px 2px 8px #000' }}>Game Over</h2>
          <button
            style={{ marginTop: 16, padding: '10px 28px', fontSize: 18, borderRadius: 8, border: 'none', background: '#ffe066', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={(e) => {
              e.stopPropagation();
              birdYRef.current = BIRD_START_Y;
              birdVelRef.current = 0;
              pipesRef.current = [];
              frameRef.current = 0;
                  setBirdY(BIRD_START_Y);
              setBirdVelocity(0);
              setPipes([]);
              setScore(0);
              scoreRef.current = 0;
              setGameState('idle');
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
};

export default FlappyBirdGame;
