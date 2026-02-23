import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BilliardTrainer.css';

interface Point {
  x: number;
  y: number;
}

interface Ball {
  id: string;
  x: number;
  y: number;
  type: 'solid' | 'dashed';
}

interface Line {
  id: string;
  from: Point;
  to: Point;
  type: 'solid' | 'dashed';
}

interface SpinPoint {
  x: number;
  y: number;
}

interface Exercise {
  id: number;
  name: string;
  layout: {
    spin: SpinPoint;
    balls: Array<{
      x: number;
      y: number;
      type: string;
    }>;
    lines: Array<{
      from: Point;
      to: Point;
      type: string;
    }>;
};
power: number;
  created_at: string;
}

interface ApiResponse {
  ok: boolean;
  id?: number;
  error?: string;
}

const API_BASE_URL = 'http://localhost:3000';

const BilliardTrainer: React.FC = () => {
  const navigate = useNavigate();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [spin, setSpin] = useState<SpinPoint>({ x: 0, y: 0 });
  const [power, setPower] = useState<number>(3);
  const [currentMode, setCurrentMode] = useState<'solid' | 'dashed' | null>(null);
  const [currentLine, setCurrentLine] = useState<Line | null>(null);
  const [draggedBall, setDraggedBall] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [exerciseName, setExerciseName] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const spinCircleRef = useRef<HTMLDivElement>(null);

  const TABLE_WIDTH = 900;
  const TABLE_HEIGHT = 450;
  const BALL_RADIUS = 14;

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Глобальные обработчики для перетаскивания
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !draggedBall || !tableRef.current) return;
      
      e.preventDefault();
      const rect = tableRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * TABLE_WIDTH - dragOffset.x;
      const y = ((e.clientY - rect.top) / rect.height) * TABLE_HEIGHT - dragOffset.y;
      
      const clampedX = Math.min(Math.max(x, BALL_RADIUS), TABLE_WIDTH - BALL_RADIUS);
      const clampedY = Math.min(Math.max(y, BALL_RADIUS), TABLE_HEIGHT - BALL_RADIUS);
      
      setBalls(prevBalls => prevBalls.map(ball => 
        ball.id === draggedBall 
          ? { ...ball, x: clampedX, y: clampedY }
          : ball
      ));
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDraggedBall(null);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, draggedBall, dragOffset]);

  const addBall = (type: 'solid' | 'dashed') => {
    const newBall: Ball = {
      id: `ball_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: TABLE_WIDTH / 2 + (Math.random() - 0.5) * 150,
      y: TABLE_HEIGHT / 2 + (Math.random() - 0.5) * 100,
      type,
    };
    setBalls([...balls, newBall]);
  };

  const setMode = (mode: 'solid' | 'dashed') => {
    setCurrentMode(mode);
  };

  const handleTableMouseDown = (e: React.MouseEvent) => {
    if (!currentMode || !tableRef.current) return;
    
    const rect = tableRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * TABLE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * TABLE_HEIGHT;
    
    const newLine: Line = {
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: { x, y },
      to: { x, y },
      type: currentMode,
    };
    
    setCurrentLine(newLine);
  };

  const handleTableMouseMove = (e: React.MouseEvent) => {
    if (!currentMode || !currentLine || !tableRef.current) return;
    
    const rect = tableRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * TABLE_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * TABLE_HEIGHT;
    
    setCurrentLine({
      ...currentLine,
      to: { x, y },
    });
  };

  const handleTableMouseUp = () => {
    if (currentLine) {
      setLines([...lines, currentLine]);
      setCurrentLine(null);
    }
  };

  const handleBallMouseDown = (e: React.MouseEvent, ballId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const ball = balls.find(b => b.id === ballId);
    if (!ball || !tableRef.current) return;
    
    const rect = tableRef.current.getBoundingClientRect();
    const offsetX = ((e.clientX - rect.left) / rect.width) * TABLE_WIDTH - ball.x;
    const offsetY = ((e.clientY - rect.top) / rect.height) * TABLE_HEIGHT - ball.y;
    
    setDraggedBall(ballId);
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  };

  const handleSpinClick = (e: React.MouseEvent) => {
    if (!spinCircleRef.current) return;
    
    const rect = spinCircleRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = rect.width / 2;
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const normalizedX = (clickX - centerX) / radius;
    const normalizedY = (clickY - centerY) / radius;
    
    const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    if (distance <= 1) {
      setSpin({ x: Number(normalizedX.toFixed(2)), y: Number(normalizedY.toFixed(2)) });
    }
  };

  const handleSaveClick = () => {
    if (balls.length === 0 && lines.length === 0) {
      setNotification({
        message: 'Добавьте хотя бы один шар или линию',
        type: 'error'
      });
      return;
    }
    setShowSaveDialog(true);
    setExerciseName('');
  };

  const saveExercise = async () => {
    if (!exerciseName.trim()) {
      setNotification({
        message: 'Введите название упражнения',
        type: 'error'
      });
      return;
    }

    setIsSaving(true);
    setShowSaveDialog(false);

    const exerciseData = {
      name: exerciseName,
      layout: {
        spin: {
          x: spin.x,
          y: spin.y,
        },
        balls: balls.map(ball => ({
          x: Number((ball.x / TABLE_WIDTH).toFixed(3)),
          y: Number((ball.y / TABLE_HEIGHT).toFixed(3)),
          type: ball.type,
        })),
        lines: lines.map(line => ({
          from: {
            x: Number((line.from.x / TABLE_WIDTH).toFixed(3)),
            y: Number((line.from.y / TABLE_HEIGHT).toFixed(3)),
          },
          to: {
            x: Number((line.to.x / TABLE_WIDTH).toFixed(3)),
            y: Number((line.to.y / TABLE_HEIGHT).toFixed(3)),
          },
          type: line.type,
        })),
    },
    power: power,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exerciseData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: ApiResponse = await response.json();
      
      if (result.ok) {
        setNotification({ 
          message: `Упражнение "${exerciseName}" сохранено!`, 
          type: 'success' 
        });
        // Очищаем форму после сохранения
        setBalls([]);
        setLines([]);
        setSpin({ x: 0, y: 0 });
        setPower(3);
        setCurrentMode(null);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setNotification({ 
        message: 'Ошибка сохранения', 
        type: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearAll = () => {
    setBalls([]);
    setLines([]);
    setSpin({ x: 0, y: 0 });
    setPower(3);
    setCurrentMode(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Бильярдный тренажер</h1>
          <nav className="nav">
            <button 
              className="nav-button active"
              onClick={() => navigate('/')}
            >
              Создание упражнений
            </button>
            <button 
              className="nav-button"
              onClick={() => navigate('/trainings')}
            >
              Мои тренировки
            </button>
          </nav>
        </div>
        <button onClick={handleSaveClick} disabled={isSaving} className="save-button">
          {isSaving ? 'Сохранение...' : 'Сохранить упражнение'}
        </button>
      </header>

      <div className="main">
        <div className="sidebar">
          <div className="section">
            <h3>Шары</h3>
            <div className="button-group">
              <button onClick={() => addBall('solid')} className="button">
                <span className="ball-indicator solid"></span>
                Обычный
              </button>
              <button onClick={() => addBall('dashed')} className="button">
                <span className="ball-indicator dashed"></span>
                Пунктирный
              </button>
            </div>
          </div>

          <div className="section">
            <h3>Линии</h3>
            <div className="button-group">
              <button 
                onClick={() => setMode('solid')} 
                className={`button ${currentMode === 'solid' ? 'active' : ''}`}
              >
                <span className="line-indicator solid"></span>
                Сплошная
              </button>
              <button 
                onClick={() => setMode('dashed')} 
                className={`button ${currentMode === 'dashed' ? 'active' : ''}`}
              >
                <span className="line-indicator dashed"></span>
                Пунктирная
              </button>
            </div>
            {currentMode && (
              <div className="mode-hint">
                Режим рисования активен
              </div>
            )}
          </div>

          <div className="section">
            <h3>Сила удара</h3>
            <div className="power-slider">
              <input
                type="range"
                min="1"
                max="5"
                value={power}
                onChange={(e) => setPower(Number(e.target.value))}
                className="slider"
              />
              <div className="power-value">{power}/5</div>
            </div>
          </div>

          <div className="section">
            <h3>Винт</h3>
            <div className="spin-area">
              <div
                ref={spinCircleRef}
                className="spin-circle"
                onClick={handleSpinClick}
              >
                <div className="spin-grid">
                  <div className="grid-line horizontal"></div>
                  <div className="grid-line vertical"></div>
                </div>
                <div
                  className="spin-point"
                  style={{
                    left: `${(spin.x + 1) * 50}%`,
                    top: `${(spin.y + 1) * 50}%`,
                  }}
                />
              </div>
              <div className="spin-coords">
                {spin.x.toFixed(2)}; {spin.y.toFixed(2)}
              </div>
            </div>
          </div>

          <button onClick={clearAll} className="clear-button">
            Очистить всё
          </button>
        </div>

        <div className="content">
          <div className="table-wrapper">
            <div
              ref={tableRef}
              className="table"
              style={{
                width: TABLE_WIDTH,
                height: TABLE_HEIGHT
              }}
              onMouseDown={handleTableMouseDown}
              onMouseMove={handleTableMouseMove}
              onMouseUp={handleTableMouseUp}
              onMouseLeave={handleTableMouseUp}
            >
              <div className="table-cloth"></div>
              
              <div className="markings">
                <div className="center-line"></div>
                <div className="center-dot"></div>
              </div>
              
              <div className="pockets">
                <div className="pocket top-left"></div>
                <div className="pocket top-right"></div>
                <div className="pocket middle-left"></div>
                <div className="pocket middle-right"></div>
                <div className="pocket bottom-left"></div>
                <div className="pocket bottom-right"></div>
              </div>
              
              {balls.map(ball => (
                <div
                  key={ball.id}
                  className={`ball ${ball.type} ${draggedBall === ball.id ? 'dragging' : ''}`}
                  style={{
                    left: ball.x - BALL_RADIUS,
                    top: ball.y - BALL_RADIUS,
                    width: BALL_RADIUS * 2,
                    height: BALL_RADIUS * 2,
                  }}
                  onMouseDown={(e) => handleBallMouseDown(e, ball.id)}
                />
              ))}
              
              <svg className="lines">
                {lines.map(line => (
                  <line
                    key={line.id}
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    className={`line ${line.type}`}
                  />
                ))}
                
                {currentLine && (
                  <line
                    x1={currentLine.from.x}
                    y1={currentLine.from.y}
                    x2={currentLine.to.x}
                    y2={currentLine.to.y}
                    className={`line ${currentLine.type} preview`}
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Сохранение упражнения</h2>
            <input
              type="text"
              placeholder="Введите название упражнения"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowSaveDialog(false)} className="modal-button cancel">
                Отмена
              </button>
              <button onClick={saveExercise} className="modal-button confirm">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default BilliardTrainer;