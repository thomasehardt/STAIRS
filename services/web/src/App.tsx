import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { SettingsPage } from '@/pages/Settings';
import { Dashboard } from "@/pages/Dashboard";
import { PlanGenerator } from "@/pages/PlanGenerator";
import { CatalogsPage } from "@/pages/Catalogs";
import { TargetDetailPage } from "@/pages/TargetDetail";
import { ForecastPage } from "@/pages/Forecast";
import { LogsPage } from "@/pages/Logs";


function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/plan" element={<PlanGenerator />} />
        <Route path="/catalogs" element={<CatalogsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/targets/:id" element={<TargetDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
