import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from './App'
import OBOLayout from '../layouts/OBOLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import RolesPage from '../pages/RolesPage'
import UsersPage from '../pages/UsersPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import ApplicationsPage from '../features/plan-permits/pages/ApplicationsPage'
import ApplicationDetailsPage from '../features/plan-permits/pages/ApplicationDetailsPage'
import PermitTypesPage from '../features/plan-permits/pages/PermitTypesPage'
import PermitTypeDetailsPage from '../features/plan-permits/pages/PermitTypeDetailsPage'
import SubmissionAppointmentPage from '../features/submission-appointments/pages/SubmissionAppointmentPage'
import RoutePlaceholder from './router/RoutePlaceholder'
import ProtectedRoute from './router/ProtectedRoute'
import GuestRoute from './router/GuestRoute'
import AuthorizationRoute from './router/AuthorizationRoute'
import { permissions } from '../config/permissions'

const route = (path, title, permission) => ({
  element: <AuthorizationRoute requiredPermission={permission} />,
  children: [{ path, element: <RoutePlaceholder title={title} /> }],
})

const protectedPage = (path, element, permission) => ({
  element: <AuthorizationRoute requiredPermission={permission} />,
  children: [{ path, element }],
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
          protectedPage('applications', <ApplicationsPage />, permissions.planPermits.read),
          protectedPage('applications/:applicationId', <ApplicationDetailsPage />, permissions.planPermits.read),
          protectedPage('applications/:applicationId/submission-appointment', <SubmissionAppointmentPage />, permissions.planPermits.read),
          protectedPage('permit-types', <PermitTypesPage />, permissions.planPermits.read),
          protectedPage('permit-types/:permitTypeId', <PermitTypeDetailsPage />, permissions.planPermits.read),
          route('receiving', 'Receiving', permissions.planPermits.receive),
          route('professionals', 'Professionals', permissions.professionals.read),
          route('professionals/verification', 'Professional Verification', permissions.professionals.review),
          route('inspections', 'Inspections', permissions.planPermits.inspect),
          {
            element: <AuthorizationRoute requiredPermission={permissions.users.manage} />,
            children: [{ path: 'users', element: <UsersPage /> }],
          },
          {
            element: <AuthorizationRoute requiredPermission={permissions.authorization.manage} />,
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
