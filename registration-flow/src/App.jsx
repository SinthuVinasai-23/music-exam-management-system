import { Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import Home from './pages/Home.jsx';
import FAQ from './pages/FAQ.jsx';
import Contact from './pages/Contact.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import DashboardPreview from './pages/DashboardPreview.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login type="candidate" />} />
        <Route path="/staff-login" element={<Login type="staff" />} />

        <Route path="/dashboard/student" element={<DashboardPreview role="student" />} />
        <Route path="/dashboard/parent" element={<DashboardPreview role="parent" />} />
        <Route path="/dashboard/teacher" element={<DashboardPreview role="teacher" />} />
        <Route path="/dashboard/invigilator" element={<DashboardPreview role="invigilator" />} />
        <Route path="/dashboard/examiner" element={<DashboardPreview role="examiner" />} />
        <Route path="/dashboard/admin" element={<DashboardPreview role="admin" />} />
        <Route path="/dashboard/super-admin" element={<DashboardPreview role="super-admin" />} />
      </Routes>
    </>
  );
}
