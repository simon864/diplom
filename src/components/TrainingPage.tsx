import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrainingPage.css';

interface Point {
  x: number;
  y: number;
}

interface Exercise {
  id: number;
  name: string;
  layout: {
    spin: { x: number; y: number };
    balls: Array<{ x: number; y: number; type: string }>;
    lines: Array<{ from: Point; to: Point; type: string }>;
};
power: number;
  created_at: string;
}

interface Training {
  id: string;
  name: string;
  exercises: Exercise[];
  created_at: string;
}

const API_BASE_URL = 'http://localhost:3000';

const TrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<number[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [trainingName, setTrainingName] = useState('');
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [score, setScore] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const TABLE_WIDTH = 900;
  const TABLE_HEIGHT = 450;
  const BALL_RADIUS = 14;

  useEffect(() => {
    loadExercises();
    loadTrainings();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/positions`);
      const data = await response.json();
      
      if (data.ok && data.positions) {
        const exercisesWithNames = data.positions.map((ex: any) => ({
          ...ex,
          name: ex.name || 'Без названия'
        }));
        setExercises(exercisesWithNames);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
      setNotification({
        message: 'Ошибка загрузки упражнений',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrainings = () => {
    const saved = localStorage.getItem('trainings');
    if (saved) {
      setTrainings(JSON.parse(saved));
    }
  };

  const saveTrainings = (newTrainings: Training[]) => {
    localStorage.setItem('trainings', JSON.stringify(newTrainings));
    setTrainings(newTrainings);
  };

  const handleCreateTraining = () => {
    if (!trainingName.trim()) {
      setNotification({
        message: 'Введите название тренировки',
        type: 'error'
      });
      return;
    }

    if (selectedExercises.length === 0) {
      setNotification({
        message: 'Выберите хотя бы одно упражнение',
        type: 'error'
      });
      return;
    }

    const selectedExercisesData = exercises.filter(ex => selectedExercises.includes(ex.id));

    const newTraining: Training = {
      id: Date.now().toString(),
      name: trainingName,
      exercises: selectedExercisesData,
      created_at: new Date().toISOString(),
    };

    const updatedTrainings = [...trainings, newTraining];
    saveTrainings(updatedTrainings);

    setShowCreateDialog(false);
    setTrainingName('');
    setSelectedExercises([]);
    setSelectedTraining(newTraining);
    setCurrentExerciseIndex(0);
    setScore('');

    setNotification({
      message: `Тренировка "${trainingName}" создана!`,
      type: 'success'
    });
  };

  const handleSelectTraining = (training: Training) => {
    setSelectedTraining(training);
    setCurrentExerciseIndex(0);
    setScore('');
  };

  const handleDeleteTraining = (trainingId: string) => {
    const updatedTrainings = trainings.filter(t => t.id !== trainingId);
    saveTrainings(updatedTrainings);
    if (selectedTraining?.id === trainingId) {
      setSelectedTraining(null);
    }
    setNotification({
      message: 'Тренировка удалена',
      type: 'success'
    });
  };

  const nextExercise = () => {
    if (selectedTraining && currentExerciseIndex < selectedTraining.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setScore('');
    }
  };

  const prevExercise = () => {
    if (selectedTraining && currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setScore('');
    }
  };

  const completeTraining = () => {
    setNotification({
      message: `Тренировка завершена! Финальный счет: ${score || 'не указан'}`,
      type: 'success'
    });
    // Можно добавить логику сохранения результата
  };

  const currentExercise = selectedTraining?.exercises[currentExerciseIndex];
  const isLastExercise = selectedTraining && currentExerciseIndex === selectedTraining.exercises.length - 1;

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>Бильярдный тренажер</h1>
          <nav className="nav">
            <button 
              className="nav-button"
              onClick={() => navigate('/')}
            >
              Создание упражнений
            </button>
            <button 
              className="nav-button active"
              onClick={() => navigate('/trainings')}
            >
              Мои тренировки
            </button>
          </nav>
        </div>
        <button 
          onClick={() => setShowCreateDialog(true)} 
          className="create-training-button"
        >
          + Создать тренировку
        </button>
      </header>

      <div className="training-main">
        <div className="training-sidebar">
          <h2>Мои тренировки</h2>
          <div className="trainings-list">
            {trainings.length === 0 ? (
              <p className="empty-message">У вас пока нет тренировок</p>
            ) : (
              trainings.map(training => (
                <div
                  key={training.id}
                  className={`training-card ${selectedTraining?.id === training.id ? 'selected' : ''}`}
                >
                  <div className="training-card-content" onClick={() => handleSelectTraining(training)}>
                    <h3>{training.name}</h3>
                    <p>{training.exercises.length} упражнений</p>
                    <small>{new Date(training.created_at).toLocaleDateString()}</small>
                  </div>
                  <button 
                    className="delete-training"
                    onClick={() => handleDeleteTraining(training.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="training-content">
          {selectedTraining ? (
            <div className="training-viewer">
              <div className="training-header">
                <h2>{selectedTraining.name}</h2>
                <div className="exercise-counter">
                  Упражнение {currentExerciseIndex + 1} из {selectedTraining.exercises.length}
                </div>
              </div>

              <div className="exercise-info">
                <h3>{currentExercise?.name}</h3>
              </div>

              <div className="table-container">
                <div className="table-wrapper">
                  <div
                    className="table"
                    style={{
                      width: TABLE_WIDTH,
                      height: TABLE_HEIGHT
                    }}
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
                    
                    {currentExercise?.layout.balls.map((ball, index) => (
                      <div
                        key={index}
                        className={`ball ${ball.type}`}
                        style={{
                          left: ball.x * TABLE_WIDTH - BALL_RADIUS,
                          top: ball.y * TABLE_HEIGHT - BALL_RADIUS,
                          width: BALL_RADIUS * 2,
                          height: BALL_RADIUS * 2,
                        }}
                      />
                    ))}
                    
                    <svg className="lines">
                      {currentExercise?.layout.lines.map((line, index) => (
                        <line
                          key={index}
                          x1={line.from.x * TABLE_WIDTH}
                          y1={line.from.y * TABLE_HEIGHT}
                          x2={line.to.x * TABLE_WIDTH}
                          y2={line.to.y * TABLE_HEIGHT}
                          className={`line ${line.type}`}
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              </div>

              <div className="exercise-controls">
                <div className="spin-container">
                  <span className="spin-label">Винт</span>
                  <div className="spin-circle small">
                    <div className="spin-grid">
                      <div className="grid-line horizontal"></div>
                      <div className="grid-line vertical"></div>
                    </div>
                    <div
                      className="spin-point"
                      style={{
                        left: `${(currentExercise?.layout.spin.x + 1) * 50}%`,
                        top: `${(currentExercise?.layout.spin.y + 1) * 50}%`,
                      }}
                    />
                  </div>
                  <div className="spin-coords">
                    {currentExercise?.layout.spin.x.toFixed(2)}; {currentExercise?.layout.spin.y.toFixed(2)}
                  </div>
                </div>

                <div className="power-display">
                  <span className="power-label">Сила удара</span>
                  <div className="power-value large">{currentExercise?.power}/5</div>
                </div>

                <div className="score-input">
                  <label>Счет</label>
                  <input
                    type="text"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Введите счет"
                    className="score-field"
                  />
                </div>
              </div>

              <div className="exercise-navigation">
                <button 
                  onClick={prevExercise} 
                  disabled={currentExerciseIndex === 0}
                  className="nav-button prev"
                >
                  ← Предыдущее
                </button>
                
                {isLastExercise ? (
                  <button 
                    onClick={completeTraining} 
                    className="nav-button complete"
                  >
                    Завершить тренировку
                  </button>
                ) : (
                  <button 
                    onClick={nextExercise} 
                    className="nav-button next"
                  >
                    Следующее →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="no-training-selected">
              <p>Выберите тренировку из списка или создайте новую</p>
            </div>
          )}
        </div>
      </div>

      {showCreateDialog && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <h2>Создание тренировки</h2>
            
            <div className="modal-section">
              <label>Название тренировки</label>
              <input
                type="text"
                placeholder="Введите название"
                value={trainingName}
                onChange={(e) => setTrainingName(e.target.value)}
                className="modal-input"
                autoFocus
              />
            </div>

            <div className="modal-section">
              <label>Выберите упражнения</label>
              {isLoading ? (
                <p className="loading-message">Загрузка упражнений...</p>
              ) : (
                <div className="exercises-list">
                  {exercises.length === 0 ? (
                    <p className="empty-message">
                      Нет сохраненных упражнений. 
                      <br />
                      <button 
                        className="create-exercise-link"
                        onClick={() => navigate('/')}
                      >
                        Создать упражнение
                      </button>
                    </p>
                  ) : (
                    exercises.map(exercise => (
                      <div
                        key={exercise.id}
                        className={`exercise-item ${selectedExercises.includes(exercise.id) ? 'selected' : ''}`}
                        onClick={() => {
                          if (selectedExercises.includes(exercise.id)) {
                            setSelectedExercises(selectedExercises.filter(id => id !== exercise.id));
                          } else {
                            setSelectedExercises([...selectedExercises, exercise.id]);
                          }
                        }}
                      >
                        <div className="exercise-checkbox">
                          {selectedExercises.includes(exercise.id) && '✓'}
                        </div>
                        <div className="exercise-info">
                          <h4>{exercise.name}</h4>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowCreateDialog(false)} className="modal-button cancel">
                Отмена
              </button>
              <button 
                onClick={handleCreateTraining} 
                className="modal-button confirm"
                disabled={selectedExercises.length === 0 || !trainingName.trim()}
              >
                Создать тренировку
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

export default TrainingPage;