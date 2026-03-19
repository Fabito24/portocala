import React, { useEffect, useRef, useState, useCallback } from 'react';

const GAME_WIDTH = 380;
const GAME_HEIGHT = 560;
const GROUND_HEIGHT = 90;
const BIRD_SIZE = 34;
const GRAVITY = 0.5;
const FLAP_STRENGTH = -8;
const BIRD_X = 80;
const BIRD_START_Y = GAME_HEIGHT / 2 - BIRD_SIZE / 2;
const OBSTACLE_WIDTH = 52;
const OBSTACLE_GAP = 140;
const OBSTACLE_INTERVAL = 85;
const OBSTACLE_SPEED = 2.9;

function getRandomObstacleY() {
  const min = 120;
  const max = GAME_HEIGHT - GROUND_HEIGHT - 120;
  return Math.floor(Math.random() * (max - min)) + min;
}

function checkCollision(birdRect, rect) {
  return (
    birdRect.x < rect.x + rect.width &&
    birdRect.x + birdRect.width > rect.x &&
    birdRect.y < rect.y + rect.height &&
    birdRect.y + birdRect.height > rect.y
  );
}

const GameInstance = ({ label, controlKey, colorStyle, startVersion, onRequestStart, onDie, alive }) => {
  const [status, setStatus] = useState('idle');
  const [birdY, setBirdY] = useState(BIRD_START_Y);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [flapping, setFlapping] = useState(false);

  const birdYRef = useRef(BIRD_START_Y);
  const birdVelRef = useRef(0);
  const obstaclesRef = useRef([]);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const rafRef = useRef();
  const lastStartRef = useRef(0);

  const reset = useCallback(() => {
    birdYRef.current = BIRD_START_Y;
    birdVelRef.current = 0;
    obstaclesRef.current = [];
    scoreRef.current = 0;
    frameRef.current = 0;
    setBirdY(BIRD_START_Y);
    setBirdVelocity(0);
    setObstacles([]);
    setScore(0);
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (!alive) return;
    if (startVersion <= lastStartRef.current) return;
    lastStartRef.current = startVersion;
    reset();
    birdVelRef.current = FLAP_STRENGTH;
    setBirdVelocity(FLAP_STRENGTH);
    setStatus('playing');
  }, [startVersion, alive, reset]);

  const handleFlap = useCallback(() => {
    if (!alive) return;
    if (status === 'idle') {
      onRequestStart();
      return;
    }
    if (status === 'playing') {
      birdVelRef.current = FLAP_STRENGTH;
      setFlapping(true);
      setTimeout(() => setFlapping(false), 90);
    }
  }, [alive, onRequestStart, status]);

  useEffect(() => {
    if (status !== 'playing') return;
    const animate = () => {
      frameRef.current += 1;
      birdVelRef.current += GRAVITY;
      birdYRef.current += birdVelRef.current;

      if (birdYRef.current < 0) {
        birdYRef.current = 0;
        birdVelRef.current = 0;
      }

      obstaclesRef.current = obstaclesRef.current
        .map((o) => ({ ...o, x: o.x - OBSTACLE_SPEED }))
        .filter((o) => o.x + OBSTACLE_WIDTH > 0);

      for (const o of obstaclesRef.current) {
        if (!o.passed && o.x + OBSTACLE_WIDTH < BIRD_X) {
          o.passed = true;
          scoreRef.current += 1;
        }
      }

      if (frameRef.current % OBSTACLE_INTERVAL === 0) {
        obstaclesRef.current.push({ x: GAME_WIDTH, gapY: getRandomObstacleY(), passed: false });
      }

      let collided = false;
      if (birdYRef.current >= GAME_HEIGHT - GROUND_HEIGHT - BIRD_SIZE) {
        birdYRef.current = GAME_HEIGHT - GROUND_HEIGHT - BIRD_SIZE;
        collided = true;
      }

      const birdRect = { x: BIRD_X, y: birdYRef.current, width: BIRD_SIZE, height: BIRD_SIZE };
      for (const o of obstaclesRef.current) {
        const topRect = { x: o.x, y: 0, width: OBSTACLE_WIDTH, height: o.gapY - OBSTACLE_GAP / 2 };
        const bottomRect = { x: o.x, y: o.gapY + OBSTACLE_GAP / 2, width: OBSTACLE_WIDTH, height: GAME_HEIGHT - GROUND_HEIGHT - (o.gapY + OBSTACLE_GAP / 2) };
        if (checkCollision(birdRect, topRect) || checkCollision(birdRect, bottomRect)) {
          collided = true;
          break;
        }
      }

      setBirdY(birdYRef.current);
      setBirdVelocity(birdVelRef.current);
      setObstacles([...obstaclesRef.current]);
      setScore(scoreRef.current);

      if (collided) {
        setStatus('dead');
        onDie(label);
      } else {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, label, alive, onDie]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === controlKey) {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controlKey, handleFlap]);

  const statusText = !alive ? 'DEAD' : status === 'playing' ? 'RUNNING' : 'READY';

  return (
    <div style={{ width: GAME_WIDTH, margin: '0 auto', position: 'relative', background: '#70c5ce', borderRadius: 14, boxShadow: '0 4px 20px #0003', overflow: 'hidden', cursor: alive ? 'pointer' : 'default' }} onClick={handleFlap}>
      <div style={{ padding: '8px 10px', fontWeight: 700, color: '#fff', textShadow: '1px 1px 4px #0009', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d9bb6' }}>
        <span>{label}</span>
        <span style={{ fontSize: 12, opacity: 0.9 }}>{statusText}</span>
      </div>
      <div style={{ width: GAME_WIDTH, height: GAME_HEIGHT, position: 'relative', background: 'linear-gradient(to bottom, #70c5ce, #53a5ca)' }}>
        <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 5, color: '#fff', fontWeight: 'bold', fontSize: 24, textShadow: '2px 2px 8px #0007' }}>{score}</div>
        <div style={{ position: 'absolute', left: BIRD_X, top: birdY, width: flapping ? BIRD_SIZE * 0.92 : BIRD_SIZE, height: flapping ? BIRD_SIZE * 0.92 : BIRD_SIZE, borderRadius: '50%', border: '2px solid #bcae6e', boxShadow: '2px 4px 8px #0004', zIndex: 2, transform: `rotate(${flapping ? -30 : Math.max(Math.min(birdVelocity * 2, 45), -45)}deg)`, transition: 'transform 0.08s linear, width 0.08s, height 0.08s', background: colorStyle }}>
          <div style={{ width: 10, height: 10, background: '#222', borderRadius: '50%', position: 'absolute', left: 24, top: 12 }} />
          <div style={{ width: 12, height: 8, background: '#ffb700', clipPath: 'polygon(0 0, 100% 50%, 0 100%)', position: 'absolute', left: 30, top: 18 }} />
        </div>
        {obstacles.map((o, idx) => (
          <React.Fragment key={`${label}-${idx}-${o.x}`}>
            <div style={{ position: 'absolute', left: o.x, top: 0, width: OBSTACLE_WIDTH, height: o.gapY - OBSTACLE_GAP / 2, background: '#1f491f', border: '2px solid #0f2f0f', borderRadius: '10px 10px 12px 12px', zIndex: 1 }}>
              <div style={{ position: 'absolute', left: 8, top: 10, width: 8, height: 24, background: '#2c662c', borderRadius: 6 }} />
              <div style={{ position: 'absolute', right: 8, top: 18, width: 8, height: 20, background: '#2c662c', borderRadius: 6 }} />
            </div>
            <div style={{ position: 'absolute', left: o.x, top: o.gapY + OBSTACLE_GAP / 2, width: OBSTACLE_WIDTH, height: GAME_HEIGHT - GROUND_HEIGHT - (o.gapY + OBSTACLE_GAP / 2), background: '#1f491f', border: '2px solid #0f2f0f', borderRadius: '12px 12px 10px 10px', zIndex: 1 }}>
              <div style={{ position: 'absolute', left: 8, bottom: 10, width: 8, height: 24, background: '#2c662c', borderRadius: 6 }} />
              <div style={{ position: 'absolute', right: 8, bottom: 20, width: 8, height: 20, background: '#2c662c', borderRadius: 6 }} />
            </div>
          </React.Fragment>
        ))}
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: GROUND_HEIGHT, background: '#ded895', borderTop: '4px solid #bcae6e' }} />
        {!alive && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', zIndex: 5, color: '#fff', fontWeight: '700' }}>PLAYER DEAD</div>}
      </div>
    </div>
  );
};

const FlappyBirdGame = () => {
  const [startVersion, setStartVersion] = useState(0);
  const [alive, setAlive] = useState({ p1: true, p2: true });

  const requestStart = useCallback(() => {
    if (!alive.p1 && !alive.p2) {
      setAlive({ p1: true, p2: true });
    }
    setStartVersion((v) => v + 1);
  }, [alive]);

  const handleDeath = useCallback((player) => {
    setAlive((prev) => ({ ...prev, [player === 'Player 1' ? 'p1' : 'p2']: false }));
  }, []);

  const p1Alive = alive.p1;
  const p2Alive = alive.p2;

  return (
    <div style={{ width: '100%', minHeight: '100vh', padding: 16, background: '#176e87', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Flappy Bird Split Screen</div>
        <div style={{ marginTop: 6, color: '#e6f7ff' }}>Player 1: Space | Player 2: Up Arrow</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, justifyItems: 'center' }}>
        <GameInstance label="Player 1" controlKey="Space" colorStyle="radial-gradient(circle at 60% 40%, #ffe066 70%, #e1a800 100%)" startVersion={startVersion} onRequestStart={requestStart} onDie={handleDeath} alive={p1Alive} />
        <GameInstance label="Player 2" controlKey="ArrowUp" colorStyle="radial-gradient(circle at 40% 30%, #6ec8ff 70%, #3a7bd5 100%)" startVersion={startVersion} onRequestStart={requestStart} onDie={handleDeath} alive={p2Alive} />
      </div>
      <div style={{ marginTop: 14, textAlign: 'center', fontWeight: 700 }}>
        {!alive.p1 && !alive.p2 ? 'Both players dead. Click any panel to restart.' : alive.p1 && alive.p2 ? 'Both players ready. Press a key to start.' : alive.p1 ? 'Player 1 still alive.' : 'Player 2 still alive.'}
      </div>
    </div>
  );
};

export default FlappyBirdGame;
