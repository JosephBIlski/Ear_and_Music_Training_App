import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DailyPage } from './pages/DailyPage';
import { Dashboard } from './pages/Dashboard';
import { GuidePage } from './pages/GuidePage';
import { LevelPage } from './pages/LevelPage';
import { ModulePage } from './pages/ModulePage';
import { PracticePage } from './pages/PracticePage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/module/:moduleId" element={<ModulePage />} />
          <Route path="/train/:moduleId/:levelId" element={<LevelPage />} />
          <Route path="/practice/:moduleId" element={<PracticePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
