import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'auth/callback/success', element: <OAuthCallbackPage /> },
      { path: 'auth/callback/failure', element: <OAuthCallbackPage mode="failure" /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
