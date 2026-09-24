import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from './layout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../features/auth/pages/LoginPage'
import LessonPackagesPage from '../features/lessons/pages/LessonPackagesPage'
import LessonEnrollmentsPage from '../features/lessons/pages/LessonEnrollmentsPage'
import LessonSchedulePage from '../features/lessons/pages/LessonSchedulePage'
import FindLessonsPage from '../features/lessons/pages/FindLessonsPage'
import MyLessonsPage from '../features/lessons/pages/MyLessonsPage'
import LessonHistoryPage from '../features/lessons/pages/LessonHistoryPage'
import InstructorTeachingPage from '../features/instructors/pages/InstructorTeachingPage'
import AuditPage from '../features/audit/pages/AuditPage'
import RentalManagementPage from '../features/rentals/pages/RentalManagementPage'
import FindRentalsPage from '../features/rentals/pages/FindRentalsPage'
import MyRentalsPage from '../features/rentals/pages/MyRentalsPage'
import RentalHistoryPage from '../features/rentals/pages/RentalHistoryPage'
import InstrumentResourcesPage from '../features/resources/pages/InstrumentResourcesPage'
import RoomResourcesPage from '../features/resources/pages/RoomResourcesPage'
import ResourceUsageHistoryPage from '../features/resources/pages/ResourceUsageHistoryPage'
import ResourceAuditPage from '../features/resources/pages/ResourceAuditPage'
import UsersPage from '../features/users/pages/UsersPage'
import PaymentPage from '../features/payments/pages/PaymentPage'
import ProtectedRoute from './router/ProtectedRoute'
import PermissionRoute from './router/PermissionRoute'
import GuestRoute from './router/GuestRoute'

const resourceReadPermissions = ['cadenza_instruments:read', 'cadenza_instruments:create', 'cadenza_instruments:update', 'cadenza_rooms:read', 'cadenza_rooms:create', 'cadenza_rooms:update']

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
            { path: 'find-lessons', element: <PermissionRoute anyPermissions={['cadenza_enrollments:create', 'cadenza_enrollments:read']} />, children: [{ index: true, element: <FindLessonsPage /> }] },
            { path: 'my-lessons', element: <PermissionRoute anyPermissions={['cadenza_enrollments:create', 'cadenza_enrollments:read']} />, children: [{ index: true, element: <MyLessonsPage /> }] },
            { path: 'lesson-history', element: <PermissionRoute anyPermissions={['cadenza_enrollments:create', 'cadenza_enrollments:read']} />, children: [{ index: true, element: <LessonHistoryPage /> }] },
            { path: 'lesson-packages', element: <PermissionRoute anyPermissions={['cadenza_lessons:read', 'cadenza_lessons:create', 'cadenza_lessons:manage']} />, children: [{ index: true, element: <LessonPackagesPage /> }] },
            { path: 'lesson-enrollments', element: <PermissionRoute anyPermissions={['cadenza_enrollments:read', 'cadenza_enrollments:create', 'cadenza_enrollments:manage']} />, children: [{ index: true, element: <LessonEnrollmentsPage /> }] },
            { path: 'lesson-schedule', element: <PermissionRoute anyPermissions={['cadenza_lessons:schedule', 'cadenza_lessons:attendance', 'cadenza_lessons:manage']} />, children: [{ index: true, element: <LessonSchedulePage /> }] },
            { path: 'my-teaching', element: <PermissionRoute permission="cadenza_lessons:attendance" />, children: [{ index: true, element: <InstructorTeachingPage /> }] },
            { path: 'audit', element: <PermissionRoute permission="audit_logs:read" />, children: [{ index: true, element: <AuditPage /> }] },
            { path: 'find-rentals', element: <PermissionRoute anyPermissions={['cadenza_rentals:read', 'cadenza_rentals:create']} />, children: [{ index: true, element: <FindRentalsPage /> }] },
            { path: 'my-rentals', element: <PermissionRoute anyPermissions={['cadenza_rentals:read', 'cadenza_rentals:create']} />, children: [{ index: true, element: <MyRentalsPage /> }] },
            { path: 'rental-history', element: <PermissionRoute anyPermissions={['cadenza_rentals:read', 'cadenza_rentals:create']} />, children: [{ index: true, element: <RentalHistoryPage /> }] },
            { path: 'rentals', element: <PermissionRoute permission="cadenza_rentals:manage" />, children: [{ index: true, element: <RentalManagementPage /> }] },
            { path: 'resources/instruments', element: <PermissionRoute anyPermissions={['cadenza_instruments:read', 'cadenza_instruments:create', 'cadenza_instruments:update']} />, children: [{ index: true, element: <InstrumentResourcesPage /> }] },
            { path: 'resources/rooms', element: <PermissionRoute anyPermissions={['cadenza_rooms:read', 'cadenza_rooms:create', 'cadenza_rooms:update']} />, children: [{ index: true, element: <RoomResourcesPage /> }] },
            { path: 'resources/usage-history', element: <PermissionRoute permission="cadenza_rentals:manage" />, children: [{ index: true, element: <ResourceUsageHistoryPage /> }] },
            { path: 'resources/audit', element: <PermissionRoute permission="audit_logs:read" />, children: [{ index: true, element: <ResourceAuditPage /> }] },
            { path: 'users', element: <PermissionRoute permission="cadenza_rentals:manage" />, children: [{ index: true, element: <UsersPage /> }] },
          ],
        }],
      },
    ],
  },
])
