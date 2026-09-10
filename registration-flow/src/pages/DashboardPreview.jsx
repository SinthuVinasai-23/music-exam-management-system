import studentDashboard from '../assets/dashboards/student-dashboard.png';
import parentDashboard from '../assets/dashboards/parent-dashboard.png';
import teacherDashboard from '../assets/dashboards/teacher-dashboard.png';
import invigilatorDashboard from '../assets/dashboards/invigilator-dashboard.png';
import examinerDashboard from '../assets/dashboards/examiner-dashboard.png';
import adminDashboard from '../assets/dashboards/admin-dashboard.png';
import superAdminDashboard from '../assets/dashboards/super-admin-dashboard.png';

const dashboards = {
  student: { label: 'Student', image: studentDashboard },
  parent: { label: 'Parent', image: parentDashboard },
  teacher: { label: 'Teacher', image: teacherDashboard },
  invigilator: { label: 'Invigilator', image: invigilatorDashboard },
  examiner: { label: 'Examiner', image: examinerDashboard },
  admin: { label: 'Admin', image: adminDashboard },
  'super-admin': { label: 'Super Admin', image: superAdminDashboard },
};

export default function DashboardPreview({ role }) {
  const dashboard = dashboards[role] ?? dashboards.student;

  return (
    <main className="dashboard-preview" aria-label={`${dashboard.label} dashboard`}>
      <img src={dashboard.image} alt={`${dashboard.label} dashboard design`} />
    </main>
  );
}
