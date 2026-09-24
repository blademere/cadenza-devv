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
import ApplicationsPage from '../features/applications/pages/ApplicationsPage'
import ApplicationFormPage from '../features/applications/pages/ApplicationFormPage'
import ApplicationDetailsPage from '../features/applications/pages/ApplicationDetailsPage'
import PermitTypesPage from '../features/applications/pages/PermitTypesPage'
import PermitTypeDetailsPage from '../features/applications/pages/PermitTypeDetailsPage'
import PermitTypeFormBuilderPage from '../features/applications/pages/PermitTypeFormBuilderPage'
import SubmissionAppointmentPage from '../features/submission-appointments/pages/SubmissionAppointmentPage'
import AppointmentsPage from '../features/appointments/pages/AppointmentsPage'
import ReceivingPage from '../features/receiving/pages/ReceivingPage'
import ReceivingApplicationPage from '../features/receiving/pages/ReceivingApplicationPage'
import ProfessionalsPage from '../features/professionals/pages/ProfessionalsPage'
import ProfessionalVerificationPage from '../features/professionals/pages/ProfessionalVerificationPage'
import ProfessionalVerificationApplyPage from '../features/professionals/pages/ProfessionalVerificationApplyPage'
import ProtectedRoute from './router/ProtectedRoute'
import GuestRoute from './router/GuestRoute'
import AuthorizationRoute from './router/AuthorizationRoute'
import RequireAnyPermission from '../features/authorization/components/RequireAnyPermission'
import { permissions } from '../config/permissions'

const protectedPage = (path, element, permission) => ({ element: <AuthorizationRoute requiredPermission={permission} />, children: [{ path, element }] })
const protectedPageWithAnyPermission = (path, element, requiredPermissions) => ({ element: <RequireAnyPermission permissions={requiredPermissions} />, children: [{ path, element }] })

export const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
    { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
    { path: 'app', element: <ProtectedRoute><OBOLayout /></ProtectedRoute>, children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'profile', element: <ProfilePage /> },
      protectedPage('applications', <ApplicationsPage />, permissions.applications.read),
      protectedPage('applications/new', <ApplicationFormPage />, permissions.applications.create),
      protectedPage('applications/:applicationId', <ApplicationDetailsPage />, permissions.applications.read),
      protectedPage('applications/:applicationId/edit', <ApplicationFormPage />, permissions.applications.update),
      protectedPage('applications/:applicationId/submission-appointment', <SubmissionAppointmentPage />, permissions.applications.read),
      protectedPage('appointments', <AppointmentsPage />, permissions.appointments.manage),
      protectedPage('permit-types', <PermitTypesPage />, permissions.permitTypes.read),
      protectedPage('permit-types/:permitTypeId', <PermitTypeDetailsPage />, permissions.permitTypes.read),
      protectedPageWithAnyPermission('permit-types/:permitTypeId/form/edit', <PermitTypeFormBuilderPage />, [permissions.forms.create, permissions.forms.update]),
      protectedPage('receiving', <ReceivingPage />, permissions.applications.receive),
      protectedPage('receiving/:applicationId', <ReceivingApplicationPage />, permissions.applications.receive),
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
