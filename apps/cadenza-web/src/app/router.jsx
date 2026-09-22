import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from './App'
import CadenzaLayout from '../layouts/CadenzaLayout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../features/auth/pages/LoginPage'
import LessonsPage from '../features/lessons/pages/LessonsPage'
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
    element: <App />,
    children: [
      { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
      { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
      {
        path: 'app',
        element: <ProtectedRoute />,
        children: [
          {
            element: <CadenzaLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'lessons', element: <PermissionRoute permission="cadenza_lessons:read" />, children: [{ index: true, element: <LessonsPage /> }] },
              { path: 'lesson-schedule', element: <PermissionRoute permission="cadenza_lessons:read" />, children: [{ index: true, element: <LessonSchedulePage /> }] },
              { path: 'rentals', element: <PermissionRoute permission="cadenza_rentals:read" />, children: [{ index: true, element: <RentalsPage /> }] },
              { path: 'resources', element: <PermissionRoute permission="cadenza_instruments:read" />, children: [{ index: true, element: <ResourcesPage /> }] },
              { path: 'users', element: <PermissionRoute permission="cadenza_students:read" />, children: [{ index: true, element: <UsersPage /> }] },
            ],
          },
        ],
      },
    ],
  },
])
