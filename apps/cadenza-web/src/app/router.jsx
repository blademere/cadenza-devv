import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from './layout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../features/auth/pages/LoginPage'
import LessonsPage from '../features/lessons/pages/LessonsPage'
import InstructorPage from '../features/instructors/pages/InstructorPage'
import AuditPage from '../features/audit/pages/AuditPage'
import RentalsPage from '../features/rentals/pages/RentalsPage'
import ResourcesPage from '../features/resources/pages/ResourcesPage'
import UsersPage from '../features/users/pages/UsersPage'
import PaymentPage from '../features/payments/pages/PaymentPage'
import ProtectedRoute from './router/ProtectedRoute'
import PermissionRoute from './router/PermissionRoute'
import GuestRoute from './router/GuestRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
      { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
      { element: <ProtectedRoute />, children: [{ path: 'payment/success', element: <PaymentPage /> }, { path: 'payment/failure', element: <PaymentPage /> }] },
      {
        path: 'app',
        element: <ProtectedRoute />,
        children: [{
          element: <AppLayout />,
          children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: 'dashboard', element: <DashboardPage /> },
            { path: 'payments/:obligationId', element: <PaymentPage /> },
            { path: 'lessons', element: <PermissionRoute permission="cadenza_lessons:read" />, children: [{ index: true, element: <LessonsPage /> }] },
            { path: 'instructor', element: <PermissionRoute permission="cadenza_lessons:attendance" />, children: [{ index: true, element: <InstructorPage /> }] },
            { path: 'audit', element: <PermissionRoute permission="audit_logs:read" />, children: [{ index: true, element: <AuditPage /> }] },
            { path: 'rentals', element: <PermissionRoute permission="cadenza_rentals:read" />, children: [{ index: true, element: <RentalsPage /> }] },
            { path: 'resources', element: <PermissionRoute permission="cadenza_instruments:read" />, children: [{ index: true, element: <ResourcesPage /> }] },
            { path: 'users', element: <PermissionRoute permission="cadenza_rentals:manage" />, children: [{ index: true, element: <UsersPage /> }] },
          ],
        }],
      },
    ],
  },
])