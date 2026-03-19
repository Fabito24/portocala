import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_WIDTH = 380;
const GAME_HEIGHT = 560;
const GROUND_HEIGHT = 90;
const BIRD_SIZE = 34;
const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const BIRD_X = 80;
const BIRD_START_Y = GAME_HEIGHT / 2 - BIRD_SIZE / 2;
const PIPE_WIDTH = 56;
const PIPE_GAP = 140;
const PIPE_INTERVAL = 85;
const PIPE_SPEED = 2.9;

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

const GameInstance = ({ label, controlKey, colorStyle, onRestart }) => {
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

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const resetGame = useCallback(() => {
    birdYRef.current = BIRD_START_Y;
    birdVelRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    frameRef.current = 0;
    setBirdY(BIRD_START_Y);
    setBirdVelocity(0);
    setPipes([]);
    setScore(0);
  }, []);

  const handleFlap = useCallback(() => {
    if (gameStateRef.current === 'idle') {
      resetGame();
      birdVelRef.current = FLAP_STRENGTH;
      setBirdVelocity(FLAP_STRENGTH);
      setGameState('playing');
    } else if (gameStateRef.current === 'playing') {
      birdVelRef.current = FLAP_STRENGTH;
    }
    setFlapping(true);
    setTimeout(() => setFlapping(false), 100);
  }, [resetGame]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const animate = () => {
      frameRef.current += 1;
      birdVelRef.current += GRAVITY;
      birdYRef.current += birdVelRef.current;

      if (birdYRef.current < 0) {
        birdYRef.current = 0;
        birdVelRef.current = 0;
      }

      pipesRef.current = pipesRef.current
        .map((p) => ({ ...p, x: p.x - PIPE_SPEED }))
        .filter((p) => p.x + PIPE_WIDTH > 0);

      for (const pipe of pipesRef.current) {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          scoreRef.current += 1;
        }
      }

      if (frameRef.current % PIPE_INTERVAL === 0) {
        pipesRef.current.push({ x: GAME_WIDTH, gapY: getRandomPipeY(), passed: false });
      }

      let collided = false;
      if (birdYRef.current >= GAME_HEIGHT - GROUND_HEIGHT - BIRD_SIZE) {
        birdYRef.current = GAME_HEIGHT - GROUND_HEIGHT - BIRD_SIZE;
        collided = true;
      }

      const birdRect = { x: BIRD_X, y: birdYRef.current, width: BIRD_SIZE, height: BIRD_SIZE };
      for (const pipe of pipesRef.current) {
        const topRect = { x: pipe.x, y: 0, width: PIPE_WIDTH, height: pipe.gapY - PIPE_GAP / 2 };
        const bottomRect = { x: pipe.x, y: pipe.gapY + PIPE_GAP / 2, width: PIPE_WIDTH, height: GAME_HEIGHT - GROUND_HEIGHT - (pipe.gapY + PIPE_GAP / 2) };
        if (checkCollision(birdRect, topRect) || checkCollision(birdRect, bottomRect)) {
          collided = true;
          break;
        }
      }

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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === controlKey) {
        e.preventDefault();
        if (gameStateRef.current === 'gameover') {
          resetGame();
          setGameState('idle');
          onRestart?.();
          return;
        }
        handleFlap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controlKey, handleFlap, resetGame, onRestart]);

  return (
    <div style={{ width: GAME_WIDTH, margin: '0 auto', position: 'relative', background: '#70c5ce', borderRadius: 14, boxShadow: '0 4px 20px #0003', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px', fontWeight: 700, color: '#fff', textShadow: '1px 1px 4px #0009', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d9bb6' }}>
        <span>{label}</span>
        <span style={{ fontSize: 12, opacity: 0.9 }}>Control: {controlKey === 'Space' ? 'Space' : 'Up Arrow'}</span>
      </div>
      <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT, position: 'relative', background: 'linear-gradient(to bottom, #70c5ce, #53a5ca)' }} onClick={handleFlap}>
        <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 5, color: '#fff', fontWeight: 'bold', fontSize: 24, textShadow: '2px 2px 8px #0007' }}>{score}</div>
        <div style={{ position: 'absolute', left: BIRD_X, top: birdY, width: flapping ? BIRD_SIZE * 0.92 : BIRD_SIZE, height: flapping ? BIRD_SIZE * 0.92 : BIRD_SIZE, borderRadius: '50%', border: '2px solid #bcae6e', boxShadow: '2px 4px 8px #0004', zIndex: 2, transform: `rotate(${flapping ? -30 : Math.max(Math.min(birdVelocity * 2, 45), -45)}deg)`, transition: 'transform 0.08s linear, width 0.08s, height 0.08s', background: colorStyle }}>
          <div style={{ width: 10, height: 10, background: '#222', borderRadius: '50%', position: 'absolute', left: 24, top: 12 }} />
          <div style={{ width: 12, height: 8, background: '#ffb700', clipPath: 'polygon(0 0, 100% 50%, 0 100%)', position: 'absolute', left: 30, top: 18 }} />
        </div>
        {pipes.map((pipe, idx) => (
          <React.Fragment key={`${label}-${idx}-${pipe.x}`}>
            <div style={{ position: 'absolute', left: pipe.x, top: 0, width: PIPE_WIDTH, height: pipe.gapY - PIPE_GAP / 2, background: '#5ec639', border: '2px solid #38761d', borderRadius: '8px 8px 24px 24px', zIndex: 1 }} />
            <div style={{ position: 'absolute', left: pipe.x, top: pipe.gapY + PIPE_GAP / 2, width: PIPE_WIDTH, height: GAME_HEIGHT - GROUND_HEIGHT - (pipe.gapY + PIPE_GAP / 2), background: '#5ec639', border: '2px solid #38761d', borderRadius: '24px 24px 8px 8px', zIndex: 1 }} />
          </React.Fragment>
        ))}
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: GROUND_HEIGHT, background: '#ded895', borderTop: '4px solid #bcae6e' }} />
        {gameState === 'idle' && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textShadow: '2px 2px 8px #0007', zIndex: 5 }}><div style={{ fontWeight: '800', marginBottom: 6 }}>Tap to Start</div><div style={{ opacity: 0.9, fontSize: 14 }}>Press {controlKey === 'Space' ? 'Space' : 'Up'} to play</div></div>}
        {gameState === 'gameover' && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', zIndex: 5, color: '#fff' }}><div style={{ fontSize: 22, fontWeight: 700 }}>Game Over</div><button style={{ marginTop: 12, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ffe066', color: '#333', fontWeight: 700, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); resetGame(); setGameState('idle'); onRestart?.(); }}>Restart</button></div>}
      </div>
    </div>
  );
};

const FlappyBirdGame = () => {
  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: 16, background: '#176e87', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}><div style={{ fontSize: 28, fontWeight: 800 }}>Flappy Bird Split Screen</div><div style={{ marginTop: 6, color: '#e6f7ff' }}>Player 1 (Space) and Player 2 (Up Arrow)</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, justifyItems: 'center' }}><GameInstance label="Player 1" controlKey="Space" colorStyle="radial-gradient(circle at 60% 40%, #ffe066 70%, #e1a800 100%)" /><GameInstance label="Player 2" controlKey="ArrowUp" colorStyle="radial-gradient(circle at 40% 30%, #6ec8ff 70%, #3a7bd5 100%)" /></div>
    </div>
  );
};

export default FlappyBirdGame;
