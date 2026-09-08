import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from './App'
import OBOLayout from '../layouts/OBOLayout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import RolesPage from '../features/authorization/pages/RolesPage'
import UsersPage from '../features/users/pages/UsersPage'
import ProfilePage from '../features/users/pages/ProfilePage'
import LoginPage from '../features/auth/pages/LoginPage'
import OAuthCallbackPage from '../features/auth/pages/OAuthCallbackPage'
import ApplicationsPage from '../features/plan-permits/pages/ApplicationsPage'
import ApplicationFormPage from '../features/plan-permits/pages/ApplicationFormPage'
import ApplicationDetailsPage from '../features/plan-permits/pages/ApplicationDetailsPage'
import PermitTypesPage from '../features/plan-permits/pages/PermitTypesPage'
import PermitTypeDetailsPage from '../features/plan-permits/pages/PermitTypeDetailsPage'
import PermitTypeFormBuilderPage from '../features/plan-permits/pages/PermitTypeFormBuilderPage'
import SubmissionAppointmentPage from '../features/submission-appointments/pages/SubmissionAppointmentPage'
import ReceivingPage from '../features/receiving/pages/ReceivingPage'
import ReceivingApplicationPage from '../features/receiving/pages/ReceivingApplicationPage'
import ProfessionalsPage from '../features/professionals/pages/ProfessionalsPage'
import ProfessionalVerificationPage from '../features/professionals/pages/ProfessionalVerificationPage'
import ProfessionalVerificationApplyPage from '../features/professionals/pages/ProfessionalVerificationApplyPage'
import ProtectedRoute from './router/ProtectedRoute'
import GuestRoute from './router/GuestRoute'
import AuthorizationRoute from './router/AuthorizationRoute'
import { permissions } from '../config/permissions'

const protectedPage = (path, element, permission) => ({ element: <AuthorizationRoute requiredPermission={permission} />, children: [{ path, element }] })

export const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
    { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
    { path: 'app', element: <ProtectedRoute><OBOLayout /></ProtectedRoute>, children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      protectedPage('applications', <ApplicationsPage />, permissions.planPermits.read),
      protectedPage('applications/new', <ApplicationFormPage />, permissions.planPermits.create),
      protectedPage('applications/:applicationId', <ApplicationDetailsPage />, permissions.planPermits.read),
      protectedPage('applications/:applicationId/edit', <ApplicationFormPage />, permissions.planPermits.update),
      protectedPage('applications/:applicationId/submission-appointment', <SubmissionAppointmentPage />, permissions.planPermits.read),
      protectedPage('permit-types', <PermitTypesPage />, permissions.permitTypes.read),
      protectedPage('permit-types/:permitTypeId', <PermitTypeDetailsPage />, permissions.permitTypes.read),
      protectedPage('permit-types/:permitTypeId/form/edit', <PermitTypeFormBuilderPage />, permissions.forms.update),
      protectedPage('receiving', <ReceivingPage />, permissions.planPermits.receive),
      protectedPage('receiving/:applicationId', <ReceivingApplicationPage />, permissions.planPermits.receive),
      protectedPage('professionals', <ProfessionalsPage />, permissions.professionals.read),
      protectedPage('professionals/verification', <ProfessionalVerificationPage />, permissions.professionals.review),
      protectedPage('professionals/verification/apply', <ProfessionalVerificationApplyPage />, permissions.professionals.create),
      { element: <AuthorizationRoute requiredPermission={permissions.users.manage} />, children: [{ path: 'users', element: <UsersPage /> }] },
      { element: <AuthorizationRoute requiredPermission={permissions.authorization.manage} />, children: [{ path: 'roles', element: <RolesPage /> }] },
    ] },
    { path: 'auth/callback/success', element: <OAuthCallbackPage /> },
    { path: 'auth/callback/failure', element: <OAuthCallbackPage mode="failure" /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ] },
])
