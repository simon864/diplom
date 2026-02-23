import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BilliardTrainer from './components/BilliardTrainer';
import TrainingPage from './components/TrainingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BilliardTrainer />} />
        <Route path="/trainings" element={<TrainingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;