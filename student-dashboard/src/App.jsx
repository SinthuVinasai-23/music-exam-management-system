import { Navigate, Route, Routes } from 'react-router-dom';
import { ExaminerProvider } from './examiner/ExaminerContext.jsx';
import ExaminerLayout from './examiner/ExaminerLayout.jsx';
import { ExaminerDashboard, Examinations, Evaluations, ExaminerNotifications } from './examiner/ExaminerPages.jsx';
import ExaminerSettings from './examiner/ExaminerSettings.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './pages/Home.jsx';
import FAQ from './pages/FAQ.jsx';
import Contact from './pages/Contact.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import { StudentProvider } from './student/context/StudentContext.jsx';
import StudentDashboard from './student/pages/StudentDashboard.jsx';
import ApplicationStep1 from './student/pages/ApplicationStep1.jsx';
import ApplicationSelection from './student/pages/ApplicationSelection.jsx';
import ApplicationConfirmation from './student/pages/ApplicationConfirmation.jsx';
import PaymentPage from './student/pages/PaymentPage.jsx';
import RegistryPage from './student/pages/RegistryPage.jsx';
import AdmissionPage from './student/pages/AdmissionPage.jsx';
import ResultsPage from './student/pages/ResultsPage.jsx';
import ResultDetailPage from './student/pages/ResultDetailPage.jsx';
import StatusPage from './student/pages/StatusPage.jsx';
import CeremonyPage from './student/pages/CeremonyPage.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/examiner" element={<ExaminerProvider><ExaminerLayout /></ExaminerProvider>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ExaminerDashboard />} />
          <Route path="examinations" element={<Examinations />} />
          <Route path="evaluations" element={<Evaluations />} />
          <Route path="settings" element={<ExaminerSettings />} />
          <Route path="notifications" element={<ExaminerNotifications />} />
        </Route>
        <Route path="/" element={<Home />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login type="candidate" />} />
        <Route path="/staff-login" element={<Login type="staff" />} />
        <Route path="/student/dashboard" element={<StudentProvider><StudentDashboard /></StudentProvider>} />
        <Route path="/student/application" element={<StudentProvider><ApplicationStep1 /></StudentProvider>} />
        <Route path="/student/application/selection" element={<StudentProvider><ApplicationSelection /></StudentProvider>} />
        <Route path="/student/application/confirmation" element={<StudentProvider><ApplicationConfirmation /></StudentProvider>} />
        <Route path="/student/payment" element={<StudentProvider><PaymentPage /></StudentProvider>} />
        <Route path="/student/applications" element={<StudentProvider><RegistryPage /></StudentProvider>} />
        <Route path="/student/admission" element={<StudentProvider><AdmissionPage /></StudentProvider>} />
        <Route path="/student/results" element={<StudentProvider><ResultsPage /></StudentProvider>} />
        <Route path="/student/results/:resultId" element={<StudentProvider><ResultDetailPage /></StudentProvider>} />
        <Route path="/student/status" element={<StudentProvider><StatusPage /></StudentProvider>} />
        <Route path="/student/ceremony" element={<StudentProvider><CeremonyPage /></StudentProvider>} />
      </Routes>
    </>
  );
}
