import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectWizard from './pages/ProjectWizard';
import SimulationConfig from './pages/SimulationConfig';
import Dashboard from './pages/Dashboard';
import ScenarioCompare from './pages/ScenarioCompare';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import GridSearch from './pages/optimization/GridSearch';
import AIOptimize from './pages/optimization/AIOptimize';
import SensitivityExplore from './pages/optimization/SensitivityExplore';
import { SimulationProvider } from './contexts/SimulationContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <SimulationProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/wizard" replace />} />
            <Route path="/wizard" element={<ProjectWizard />} />
            <Route path="/config" element={<SimulationConfig />} />
            <Route path="/config/:projectId" element={<SimulationConfig />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:simulationId" element={<Dashboard />} />
            <Route path="/compare" element={<ScenarioCompare />} />
            <Route path="/optimization/grid" element={<GridSearch />} />
            <Route path="/optimization/ai" element={<AIOptimize />} />
            <Route path="/optimization/sensitivity" element={<SensitivityExplore />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mypage" element={<MyPage />} />
          </Routes>
        </Layout>
      </SimulationProvider>
    </AuthProvider>
  );
}

export default App;
