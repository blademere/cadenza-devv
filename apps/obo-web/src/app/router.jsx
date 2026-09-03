import { Navigate, createBrowserRouter } from 'react-router-dom'
import App from './App'
import OBOLayout from '../layouts/OBOLayout'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import RolesPage from '../pages/RolesPage'
import UsersPage from '../pages/UsersPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import ProtectedRoute from './router/ProtectedRoute'
import GuestRoute from './router/GuestRoute'
import AuthorizationRoute from './router/AuthorizationRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <GuestRoute><HomePage /></GuestRoute> },
      { path: 'login', element: <GuestRoute><LoginPage /></GuestRoute> },
      {
        element: <ProtectedRoute><OBOLayout /></ProtectedRoute>,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          {
            element: <AuthorizationRoute requiredPermission="authorization:manage" />,
            children: [{ path: 'roles', element: <RolesPage /> }],
          },
          {
            element: <AuthorizationRoute requiredPermission="users:manage" />,
            children: [{ path: 'users', element: <UsersPage /> }],
          },
        ],
      },
      { path: 'auth/callback/success', element: <OAuthCallbackPage /> },
      { path: 'auth/callback/failure', element: <OAuthCallbackPage mode="failure" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
