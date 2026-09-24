import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from './layout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../features/auth/pages/LoginPage'
import LessonManagementPage from '../features/lessons/pages/LessonManagementPage'
import CustomerLessonsPage from '../features/lessons/pages/CustomerLessonsPage'
import InstructorTeachingPage from '../features/instructors/pages/InstructorTeachingPage'
import AuditPage from '../features/audit/pages/AuditPage'
import RentalManagementPage from '../features/rentals/pages/RentalManagementPage'
import CustomerRentalsPage from '../features/rentals/pages/CustomerRentalsPage'
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
            { path: 'my-lessons', element: <PermissionRoute anyPermissions={['cadenza_enrollments:create', 'cadenza_enrollments:read']} />, children: [{ index: true, element: <CustomerLessonsPage /> }] },
            { path: 'lessons', element: <PermissionRoute anyPermissions={['cadenza_lessons:read', 'cadenza_lessons:create', 'cadenza_lessons:manage', 'cadenza_lessons:schedule']} />, children: [{ index: true, element: <LessonManagementPage /> }] },
            { path: 'my-teaching', element: <PermissionRoute permission="cadenza_lessons:attendance" />, children: [{ index: true, element: <InstructorTeachingPage /> }] },
            { path: 'audit', element: <PermissionRoute permission="audit_logs:read" />, children: [{ index: true, element: <AuditPage /> }] },
            { path: 'my-rentals', element: <PermissionRoute anyPermissions={['cadenza_rentals:read', 'cadenza_rentals:create']} />, children: [{ index: true, element: <CustomerRentalsPage /> }] },
            { path: 'rentals', element: <PermissionRoute permission="cadenza_rentals:manage" />, children: [{ index: true, element: <RentalManagementPage /> }] },
            { path: 'resources', element: <PermissionRoute anyPermissions={['cadenza_instruments:read', 'cadenza_instruments:create', 'cadenza_instruments:update', 'cadenza_rooms:read', 'cadenza_rooms:create', 'cadenza_rooms:update']} />, children: [{ index: true, element: <ResourcesPage /> }] },
            { path: 'users', element: <PermissionRoute permission="cadenza_rentals:manage" />, children: [{ index: true, element: <UsersPage /> }] },
          ],
        }],
      },
    ],
  },
])