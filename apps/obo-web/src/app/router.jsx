import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import App from './App'
import OBOLayout from '../layouts/OBOLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import RolesPage from '../pages/RolesPage'
import UsersPage from '../pages/UsersPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import RoutePlaceholder from './router/RoutePlaceholder'
import ProtectedRoute from './router/ProtectedRoute'
import GuestRoute from './router/GuestRoute'
import AuthorizationRoute from './router/AuthorizationRoute'

const route = (path, title, permission) => ({
  element: <AuthorizationRoute requiredPermission={permission} />,
  children: [{ path, element: <RoutePlaceholder title={title} /> }],
})

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
      { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
      {
        path: 'app',
        element: <ProtectedRoute><OBOLayout /></ProtectedRoute>,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          route('applications', 'Applications', 'obo_plan_permits:read'),
          route('appointments', 'Appointments', 'obo_plan_permits:read'),
          route('permit-types', 'Permit Types', 'obo_plan_permits:read'),
          route('receiving', 'Receiving', 'obo_plan_permits:receive'),
          route('professionals', 'Professionals', 'obo_professionals:read'),
          route('professionals/verification', 'Professional Verification', 'obo_professionals:review'),
          route('inspections', 'Inspections', 'obo_plan_permits:inspect'),
          {
            element: <AuthorizationRoute requiredPermission="users:manage" />,
            children: [{ path: 'users', element: <UsersPage /> }],
          },
          {
            element: <AuthorizationRoute requiredPermission="authorization:manage" />,
            children: [{ path: 'roles', element: <RolesPage /> }],
          },
        ],
      },
      { path: 'auth/callback/success', element: <OAuthCallbackPage /> },
      { path: 'auth/callback/failure', element: <OAuthCallbackPage mode="failure" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
