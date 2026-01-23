import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProjectWizard from './pages/ProjectWizard';
import SimulationConfig from './pages/SimulationConfig';
import Dashboard from './pages/Dashboard';
import ScenarioCompare from './pages/ScenarioCompare';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/wizard" replace />} />
        <Route path="/wizard" element={<ProjectWizard />} />
        <Route path="/config" element={<SimulationConfig />} />
        <Route path="/config/:projectId" element={<SimulationConfig />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:simulationId" element={<Dashboard />} />
        <Route path="/compare" element={<ScenarioCompare />} />
      </Routes>
    </Layout>
  );
}

export default App;
