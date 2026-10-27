import CeremonyPass from './pages/CeremonyPass.jsx';
import ExaminerAdmission from './examiner/ExaminerAdmission.jsx';
import PublicSubjectDetail from './pages/PublicSubjectDetail.jsx';
import './styles/ensemble-portal-refresh.css';
import PublicHeader from './components/PublicHeader.jsx';
import Footer from './components/Footer.jsx';
import SubjectPage, { LearningHome } from "./student/pages/SubjectPage.jsx";
import StudentAccount from "./student/pages/StudentAccount.jsx";
import PublicSubjects from "./pages/PublicSubjects.jsx";
import AddCandidate from "./pages/AddCandidate.jsx";
import DemoAdmin from "./pages/DemoAdmin.jsx";
import Recover from "./pages/Recover.jsx";
import About from "./pages/About.jsx";
import Supervisor from "./supervisor/Supervisor.jsx";
import TeacherPortal from "./teacher/App.jsx";
import ApplicantGate from "./auth/ApplicantGate.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ExaminerProvider } from "./examiner/ExaminerContext.jsx";
import ExaminerLayout from "./examiner/ExaminerLayout.jsx";
import {
  ExaminerDashboard,
  Examinations,
  Evaluations,
  ExaminerNotifications,
} from "./examiner/ExaminerPages.jsx";
import ExaminerSettings from "./examiner/ExaminerSettings.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Home from "./pages/Home.jsx";
import FAQ from "./pages/FAQ.jsx";
import Contact from "./pages/Contact.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import { StudentProvider } from "./student/context/StudentContext.jsx";
import StudentDashboard from "./student/pages/StudentDashboard.jsx";
import ApplicationStep1 from "./student/pages/ApplicationStep1.jsx";
import ApplicationSelection from "./student/pages/ApplicationSelection.jsx";
import ApplicationConfirmation from "./student/pages/ApplicationConfirmation.jsx";
import PaymentPage from "./student/pages/PaymentPage.jsx";
import RegistryPage from "./student/pages/RegistryPage.jsx";
import AdmissionPage from "./student/pages/AdmissionPage.jsx";
import ResultsPage from "./student/pages/ResultsPage.jsx";
import ResultDetailPage from "./student/pages/ResultDetailPage.jsx";
import StatusPage from "./student/pages/StatusPage.jsx";
import CeremonyPage from "./student/pages/CeremonyPage.jsx";
import ParentPreview from "./pages/ParentPreview.jsx";
import DashboardPreview from "./pages/DashboardPreview.jsx";

export default function App() {
  const location = useLocation();
  const studentPage = location.pathname.startsWith("/student/") || /^\/parent\/student\//.test(location.pathname);
  const portalPage = /^\/(student|parent|teacher|examiner|supervisor|dashboard|portal)(\/|$)/.test(location.pathname);
  return (
    <div className={portalPage ? 'icfa-portal-page' : 'icfa-public-page'}>
      <ScrollToTop />
      {!portalPage && <PublicHeader />}
      <Routes>
        <Route path="/portal/dashboard" element={<ApplicantGate />} />
        <Route
          path="/parent/add-candidate"
          element={
            <ApplicantGate role="parent">
              <AddCandidate />
            </ApplicantGate>
          }
        />
        <Route
          path="/parent/dashboard"
          element={
            <ApplicantGate role="parent">
              <ParentPreview />
            </ApplicantGate>
          }
        />
        <Route
          path="/parent/student/:studentSlug/dashboard"
          element={
            <ApplicantGate role="parent">
              <StudentProvider>
                <StudentDashboard />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/examiner"
          element={
            <ExaminerProvider>
              <ExaminerLayout />
            </ExaminerProvider>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ExaminerDashboard />} />
          <Route path="examinations" element={<Examinations />} />
          <Route path="evaluations" element={<Evaluations />} />

          <Route path="settings" element={<ExaminerSettings />} />
          <Route path="notifications" element={<ExaminerNotifications />} />
        </Route>
        <Route path="/supervisor/*" element={<Supervisor />} />
        <Route
          path="/dashboard/supervisor"
          element={<Navigate to="/supervisor" replace />}
        />
        <Route path="/teacher/*" element={<TeacherPortal />} />
        <Route path="/" element={<Home />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/verify"
          element={<Navigate to="/verify-email" replace />}
        />
        <Route path="/about" element={<About />} />
        <Route path="/forgot-password" element={<Recover />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login type="candidate" />} />
        <Route path="/staff-login" element={<Login type="staff" />} />
        <Route path="/examiner/admission" element={<ExaminerAdmission />} />
        <Route path="/ceremony/pass" element={<CeremonyPass />} />
        <Route path="/subjects" element={<PublicSubjects />} />
        <Route path="/subjects/:subjectId" element={<PublicSubjectDetail />} />
        <Route
          path="/student/subjects/:subjectId"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <SubjectPage />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/subjects"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <LearningHome />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/learning"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <LearningHome />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/account"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <StudentAccount />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route path="/student/practice" element={<ApplicantGate role="student"><StudentProvider><StudentDashboard practiceOnly /></StudentProvider></ApplicantGate>} />
        <Route
          path="/student/dashboard"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <StudentDashboard />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/application"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <ApplicationStep1 />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/application/selection"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <ApplicationSelection />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/application/confirmation"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <ApplicationConfirmation />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/payment"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <Navigate to="/student/applications" replace />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/applications"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <RegistryPage />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/admission"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <AdmissionPage />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/results"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <ResultsPage />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/results/:resultId"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <ResultDetailPage />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/status"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <RegistryPage />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/student/ceremony"
          element={
            <ApplicantGate role="student">
              <StudentProvider>
                <CeremonyPage />
              </StudentProvider>
            </ApplicantGate>
          }
        />
        <Route
          path="/dashboard/student"
          element={<Navigate to="/student/dashboard" replace />}
        />
        <Route
          path="/dashboard/parent"
          element={<Navigate to="/parent/dashboard" replace />}
        />
        <Route
          path="/dashboard/teacher"
          element={<Navigate to="/teacher/dashboard" replace />}
        />
        <Route
          path="/dashboard/invigilator"
          element={<DashboardPreview role="invigilator" />}
        />
        <Route
          path="/dashboard/examiner"
          element={<DashboardPreview role="examiner" />}
        />
        <Route path="/dashboard/admin/*" element={<DemoAdmin />} />
        <Route
          path="/dashboard/super-admin"
          element={<DashboardPreview role="super-admin" />}
        />
      </Routes>
      <Footer />
    </div>
  );
}
