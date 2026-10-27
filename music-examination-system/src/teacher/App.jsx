import ExamManagement from '../pages/ExamManagement.jsx';
'use client';
import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import './styles.css';
import './dialogs.css';
import './responsive.css';
import './ensemble-dashboard.css';
import { PortalProvider } from './store';
import Layout from './components/Layout';
import Dialogs from './components/Dialogs';
import Dashboard from './views/Dashboard';
import Applications from './views/Applications';
import Students from './views/Students';
import Schedule from './views/Schedule';
import Settings from './views/Settings';
import Notifications from './views/Notifications';
import { Button, Icon } from './components/ui';
function Portal() {
  const go = useNavigate(), pathname = useLocation().pathname;
  const router = React.useMemo(() => ({push: go, replace: (path) => go(path, {replace: true}), back: () => go(-1)}), [go]);
  const page = pathname.replace(/^\/teacher\/?/, '') || 'dashboard';
  const [modal, setModal] = useState(null),
    [authenticated, setAuthenticated] = useState(
      () => sessionStorage.getItem('teacher-demo-auth') !== 'signed-out',
    );
  const close = useCallback(() => setModal(null), [setModal]);
  const navigate = useCallback(
    (route) => router.push(`/teacher/${route}`),
    [router],
  );
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const logout = () => {
    sessionStorage.setItem('teacher-demo-auth', 'signed-out');
    setModal(null);
    router.replace('/');
  };
  const back = () => {
    if (window.history.length > 1) router.back();
    else navigate('dashboard');
  };
  if(page==='exam-slots') return <Navigate to="/teacher/students" replace />;
  if (!authenticated && page !== 'exam-applications') return <Navigate to="/staff-login" replace />;
  const valid = [
    'exam-applications',
    'dashboard',
    'application-line',
    'students',
    'exam-slots',
    'settings',
    'settings/security',
    'notifications',
  ];
  return (
    <Layout page={page} navigate={navigate} logout={logout}>
      {page === 'exam-applications' && <ExamManagement />}
      {page === 'dashboard' && <Dashboard navigate={navigate} />}
      {page === 'application-line' && <Applications open={setModal} />}
      {page === 'students' && <Students open={setModal} />}
      {page === 'exam-slots' && <Schedule open={setModal} />}
      {page.startsWith('settings') && (
        <Settings
          security={page === 'settings/security'}
          navigate={navigate}
          open={setModal}
          back={back}
          logout={logout}
        />
      )}
      {page === 'notifications' && <Notifications back={back} />}
      {!valid.includes(page) && (
        <div className="empty">
          <h1>Page not found</h1>
          <Button onClick={() => navigate('dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      )}
      <Dialogs modal={modal} close={close} replace={setModal} />
    </Layout>
  );
}
const subscribe = () => () => {};
export default function App() {
  const pathname = useLocation().pathname;
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <div className="teacher-portal"><PortalProvider>
      <Portal key={pathname} />
    </PortalProvider></div>
  ) : (
    <output className="app-loading">Opening Teacher Portal…</output>
  );
}
