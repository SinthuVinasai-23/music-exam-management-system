'use client';
import React, {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter(),
    pathname = usePathname();
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
    setAuthenticated(false);
    setModal(null);
    router.replace('/login');
  };
  const back = () => {
    if (window.history.length > 1) router.back();
    else navigate('dashboard');
  };
  if (!authenticated || pathname === '/login')
    return (
      <main className="login-page">
        <div className="login-card">
          <Icon name="Music" size={45} />
          <span className="eyebrow">MUSIC EXAMINATION MANAGEMENT SYSTEM</span>
          <h1>Teacher Portal</h1>
          <p>
            You’re viewing a frontend demonstration.
            <br />
            Enter the demo to explore the teacher workflow.
          </p>
          <Button
            onClick={() => {
              sessionStorage.setItem('teacher-demo-auth', 'active');
              setAuthenticated(true);
              router.replace('/teacher/dashboard');
            }}
          >
            Enter Teacher Demo
          </Button>
          <small>
            Demo records are stored in this browser. No real emails or refunds
            are sent.
          </small>
        </div>
      </main>
    );
  const valid = [
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
  const pathname = usePathname();
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? (
    <PortalProvider>
      <Portal key={pathname} />
    </PortalProvider>
  ) : (
    <output className="app-loading">Opening Teacher Portal…</output>
  );
}
