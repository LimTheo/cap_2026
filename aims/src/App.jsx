import { Routes, Route, Navigate } from 'react-router-dom'
import ManagerLayout from './layouts/ManagerLayout'
import WorkerLayout from './layouts/WorkerLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/manager/DashboardPage'
import UploadPage from './pages/manager/UploadPage'
import AIAnalysisPage from './pages/manager/AIAnalysisPage'
import ProceduresListPage from './pages/manager/ProceduresListPage'
import ProcedureEditPage from './pages/manager/ProcedureEditPage'
import PublishPage from './pages/manager/PublishPage'
import WorkersPage from './pages/manager/WorkersPage'
import NotificationsPage from './pages/manager/NotificationsPage'
import HomePage from './pages/worker/HomePage'
import ProcedureViewPage from './pages/worker/ProcedureViewPage'
import ConfirmPage from './pages/worker/ConfirmPage'
import HistoryPage from './pages/worker/HistoryPage'
import SettingsPage from './pages/worker/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/manager" element={<ManagerLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="analysis/:id" element={<AIAnalysisPage />} />
        <Route path="procedures" element={<ProceduresListPage />} />
        <Route path="procedures/:id" element={<ProcedureEditPage />} />
        <Route path="publish" element={<PublishPage />} />
        <Route path="workers" element={<WorkersPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="/worker" element={<WorkerLayout />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="procedure/:id" element={<ProcedureViewPage />} />
        <Route path="confirm/:id" element={<ConfirmPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
