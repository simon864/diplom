import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BilliardTrainer.css';
import tableImg from '../assets/images/table.jpg'

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

interface ExerciseData {
  title: string;
  description: string;
  position: {
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
    spin?: SpinPoint;
    power?: number;
  };
}

interface ApiResponse {
  ok: boolean;
  id?: number;
  error?: string;
}

type PowerValue = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4;

const API_BASE_URL = 'http://localhost:3000';

const BilliardTrainer: React.FC = () => {
  const navigate = useNavigate();
  const [balls, setBalls] = useState<Ball[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [spin, setSpin] = useState<SpinPoint | undefined>(undefined);
  const [power, setPower] = useState<PowerValue | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currentMode, setCurrentMode] = useState<'solid' | 'dashed' | null>(null);
  const [currentLine, setCurrentLine] = useState<Line | null>(null);
  const [draggedBall, setDraggedBall] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedElement, setSelectedElement] = useState<{ type: 'ball' | 'line'; id: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const spinCircleRef = useRef<HTMLDivElement>(null);

  const TABLE_SCALE = 4;
  const TABLE_WIDTH = 185 * TABLE_SCALE;
  const TABLE_HEIGHT = 92 * TABLE_SCALE;
  const BALL_RADIUS = (4 * TABLE_SCALE) / 2;

  const powerValues: PowerValue[] = [1, 1.5, 2, 2.5, 3, 3.5, 4];

  const getPowerColor = (value: PowerValue): string => {
    const colors = {
      1: '#0066FF',
      1.5: '#4DA6FF',
      2: '#80E5FF',
      2.5: '#00CC99',
      3: '#99FF99',
      3.5: '#FFA64D',
      4: '#FF4D4D'
    };
    return colors[value];
  };

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

  // Удаление выбранного элемента
  const deleteSelectedElement = () => {
    if (!selectedElement) return;

    if (selectedElement.type === 'ball') {
      setBalls(balls.filter(b => b.id !== selectedElement.id));
    } else if (selectedElement.type === 'line') {
      setLines(lines.filter(l => l.id !== selectedElement.id));
    }

    setSelectedElement(null);
    setNotification({
      message: 'Элемент удален',
      type: 'success'
    });
  };

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
    setSelectedElement(null);
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
    setSelectedElement(null);
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
    setSelectedElement({ type: 'ball', id: ballId });
  };

  const handleLineClick = (lineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement({ type: 'line', id: lineId });
  };

  const handleSpinClick = (e: React.MouseEvent) => {
    if (!spinCircleRef.current) return;
    
    const rect = spinCircleRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = rect.width / 2;
    
    const clickX = e.clientX - rect.left - centerX;
    const clickY = e.clientY - rect.top - centerY;
    
    const normalizedX = Number((clickX / radius).toFixed(2));
    const normalizedY = Number((clickY / radius).toFixed(2));
    
    const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    if (distance <= 1) {
      setSpin({ x: normalizedX, y: normalizedY });
    }
  };

  const clearSpin = () => {
    setSpin(undefined);
  };

  const saveExercise = async () => {
    if (!title.trim()) {
      setNotification({
        message: 'Введите название упражнения',
        type: 'error'
      });
      return;
    }

    if (!description.trim()) {
      setNotification({
        message: 'Введите описание упражнения',
        type: 'error'
      });
      return;
    }

    setIsSaving(true);

    const exerciseData: ExerciseData = {
      title: title,
      description: description,
      position: {
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
    };

    if (spin) {
      exerciseData.position.spin = spin;
    }

    if (power) {
      exerciseData.position.power = power;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/exercises`, {
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
          message: `Упражнение "${title}" сохранено! ID: ${result.id}`, 
          type: 'success' 
        });
        setBalls([]);
        setLines([]);
        setSpin(undefined);
        setPower(undefined);
        setTitle('');
        setDescription('');
        setCurrentMode(null);
        setSelectedElement(null);
      }
    } catch (error) {
      setNotification({ 
        message: error instanceof Error ? error.message : 'Ошибка сохранения', 
        type: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearAll = () => {
    if (balls.length === 0 && lines.length === 0) {
      setTitle('');
      setDescription('');
      setSpin(undefined);
      setPower(undefined);
      setCurrentMode(null);
      setSelectedElement(null);
      return;
    }

    if (window.confirm('Очистить всё?')) {
      setBalls([]);
      setLines([]);
      setSpin(undefined);
      setPower(undefined);
      setCurrentMode(null);
      setSelectedElement(null);
    }
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
      </header>

      <div className="main">
        <div className="sidebar">
          <div className="section">
            <h3>Название упражнения <span className="required">*</span></h3>
            <input
              type="text"
              placeholder="Введите название"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-input"
            />
          </div>

          <div className="section">
            <h3>Описание <span className="required">*</span></h3>
            <textarea
              placeholder="Введите описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-input textarea"
              rows={3}
            />
          </div>

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
            <h3>Сила удара {power !== undefined && `: ${power}`}</h3>
            <div className="power-buttons-grid">
              {powerValues.map(value => (
                <button
                  key={value}
                  onClick={() => setPower(power === value ? undefined : value)}
                  className={`power-button ${power === value ? 'selected' : ''}`}
                  style={{
                    backgroundColor: getPowerColor(value),
                    color: value >= 3 ? '#333' : 'white',
                    border: power === value ? '2px solid #333' : 'none',
                    opacity: power === value ? 1 : 0.8,
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            {power !== undefined && (
              <button onClick={() => setPower(undefined)} className="clear-small-button" style={{backgroundColor : "#007AFF", color : "white"}}>
                Сбросить силу
              </button>
            )}
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
                {spin && (
                  <div
                    className="spin-point"
                    style={{
                      left: `${(spin.x + 1) * 50}%`,
                      top: `${(spin.y + 1) * 50}%`,
                    }}
                  />
                )}
              </div>
              {spin && (
                <button onClick={clearSpin} className="clear-small-button" style={{backgroundColor : "#007AFF", color : "white"}}>
                  Сбросить винт
                </button>
              )}
            </div>
          </div>

          {selectedElement && (
            <div className="selected-element-actions">
              <p>Выбран {selectedElement.type === 'ball' ? 'шар' : 'линия'}</p>
              <button onClick={deleteSelectedElement} className="delete-element-button">
                🗑️ Удалить элемент
              </button>
            </div>
          )}

          <div className="action-buttons">
            <button onClick={clearAll} className="clear-button" style={{backgroundColor : "#007AFF", color : "white", fontWeight : "600"}}>
              Очистить
            </button>
            <button 
              onClick={saveExercise} 
              disabled={isSaving || !title.trim() || !description.trim()}
              className="save-button"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить упражнение'}
            </button>
          </div>
        </div>

        <div className="content">
          <div className="table-wrapper" style={{               
                backgroundImage: `url(${tableImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'}}>
            <div
              ref={tableRef}
              className="table"
              style={{
                width: TABLE_WIDTH,
                height: TABLE_HEIGHT,
              }}
              onMouseDown={handleTableMouseDown}
              onMouseMove={handleTableMouseMove}
              onMouseUp={handleTableMouseUp}
              onMouseLeave={handleTableMouseUp}
            >
              {balls.map(ball => (
                <div
                  key={ball.id}
                  className={`ball ${ball.type} ${draggedBall === ball.id ? 'dragging' : ''} ${selectedElement?.type === 'ball' && selectedElement.id === ball.id ? 'selected' : ''}`}
                  style={{
                    position: 'absolute',
                    left: ball.x - BALL_RADIUS,
                    top: ball.y - BALL_RADIUS,
                    width: BALL_RADIUS * 2,
                    height: BALL_RADIUS * 2,
                    zIndex: draggedBall === ball.id ? 100 : 10
                  }}
                  onMouseDown={(e) => handleBallMouseDown(e, ball.id)}
                />
              ))}
              
              <svg className="lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {lines.map(line => (
                  <line
                    key={line.id}
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    className={`line ${line.type} ${selectedElement?.type === 'line' && selectedElement.id === line.id ? 'selected' : ''}`}
                    onClick={(e) => handleLineClick(line.id, e)}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
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

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default BilliardTrainer;