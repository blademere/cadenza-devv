import {Navigate,createBrowserRouter} from 'react-router-dom'
import App from './App'
import CadenzaLayout from '../layouts/CadenzaLayout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../features/auth/pages/LoginPage'
import ProtectedRoute from './router/ProtectedRoute'
import GuestRoute from './router/GuestRoute'
const placeholder=n=>()=> <div className="cadenza-page"><h1>{n}</h1><p>Ready for the Cadenza domain feature.</p></div>
export const router=createBrowserRouter([{path:'/',element:<App/>,children:[{index:true,element:<GuestRoute><HomePage/></GuestRoute>},{path:'login',element:<GuestRoute><LoginPage/></GuestRoute>},{path:'app',element:<ProtectedRoute><CadenzaLayout/></ProtectedRoute>,children:[{index:true,element:<Navigate to="dashboard" replace/>},{path:'dashboard',element:<DashboardPage/>},{path:'lessons',element:React.createElement(placeholder('Lessons'))},{path:'lesson-schedule',element:React.createElement(placeholder('Lesson Schedule'))},{path:'rentals',element:React.createElement(placeholder('Rentals'))},{path:'resources',element:React.createElement(placeholder('Resources'))},{path:'users',element:React.createElement(placeholder('Users'))}]}]}])
