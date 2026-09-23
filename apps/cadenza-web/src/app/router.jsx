import { Navigate, createBrowserRouter } from 'react-router-dom'
import AppLayout from './layout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../features/auth/pages/LoginPage'
import LessonsPage from '../features/lessons/pages/LessonsPage'
import PaymentsPage from '../features/payments/pages/PaymentsPage'
import AuditPage from '../features/audit/pages/AuditPage'
import LessonSchedulePage from '../features/scheduling/pages/LessonSchedulePage'
import RentalsPage from '../features/rentals/pages/RentalsPage'
import ResourcesPage from '../features/resources/pages/ResourcesPage'
import UsersPage from '../features/users/pages/UsersPage'
import ProtectedRoute from './router/ProtectedRoute'
import PermissionRoute from './router/PermissionRoute'
import GuestRoute from './router/GuestRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
      { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
      {
        path: 'app',
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              {
                path: 'lessons',
                element: <PermissionRoute permission="cadenza_lessons:read" />,
                children: [{ index: true, element: <LessonsPage /> }],
              },
              {
                path: 'payments',
                element: <PermissionRoute permission="cadenza_payments:read" />,
                children: [{ index: true, element: <PaymentsPage /> }],
              },
              {
                path: 'audit',
                element: <PermissionRoute permission="audit_logs:read" />,
                children: [{ index: true, element: <AuditPage /> }],
              },
              {
                path: 'lesson-schedule',
                element: <PermissionRoute permission="cadenza_lessons:read" />,
                children: [{ index: true, element: <LessonSchedulePage /> }],
              },
              {
                path: 'rentals',
                element: <PermissionRoute permission="cadenza_rentals:read" />,
                children: [{ index: true, element: <RentalsPage /> }],
              },
              {
                path: 'resources',
                element: <PermissionRoute permission="cadenza_instruments:read" />,
                children: [{ index: true, element: <ResourcesPage /> }],
              },
              {
                path: 'users',
                element: <PermissionRoute permission="cadenza_students:read" />,
                children: [{ index: true, element: <UsersPage /> }],
              },
            ],
          },
        ],
      },
    ],
  },
])
