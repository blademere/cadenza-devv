import { Route, Routes } from 'react-router-dom';

import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/layouts/AuthLayout';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';

import LandingPage from '@/pages/landing/pages/LandingPage';
import LoginPage from '@/pages/auth/pages/LoginPage';
import SignupPage from '@/pages/auth/pages/SignupPage';
import OAuthCallbackPage from '@/pages/auth/pages/OAuthCallbackPage';
import EmailOtpPage from '@/pages/auth/pages/EmailOtpPage';

import DashboardPage from '@/pages/admin/pages/DashboardPage';
import StudentsPage from '@/pages/admin/pages/StudentsPage';
import InstructorsPage from '@/pages/admin/pages/InstructorsPage';
import CoursesPage from '@/pages/admin/pages/CoursesPage';
import EnrollmentsPage from '@/pages/admin/pages/EnrollmentsPage';
import ClassSchedulePage from '@/pages/admin/pages/ClassSchedulePage';
import RoomsPage from '@/pages/admin/pages/RoomsPage';
import RoomRentalsPage from '@/pages/admin/pages/RoomRentalsPage';
import InstrumentsPage from '@/pages/admin/pages/InstrumentsPage';
import InstrumentRentalsPage from '@/pages/admin/pages/InstrumentRentalsPage';
import AttendancePage from '@/pages/admin/pages/AttendancePage';
import PaymentsPage from '@/pages/admin/pages/PaymentsPage';
import EnrollmentRatesPage from '@/pages/admin/pages/EnrollmentRatesPage';
import UserManagementPage from '@/pages/admin/pages/UserManagementPage';
import ReportsPage from '@/pages/admin/pages/ReportsPage';
import AuditLogsPage from '@/pages/admin/pages/AuditLogsPage';
import SettingsPage from '@/pages/admin/pages/SettingsPage';
import AdminProfilePage from '@/pages/admin/pages/AdminProfilePage';
import NotificationsPage from '@/pages/admin/pages/NotificationsPage';
import HelpPage from '@/pages/admin/pages/HelpPage';

import FrontDeskDashboardPage from '@/pages/front-desk/pages/FrontDeskDashboardPage';
import FrontDeskClassSchedulePage from '@/pages/front-desk/pages/FrontDeskClassSchedulePage';
import FrontDeskStudentsPage from '@/pages/front-desk/pages/FrontDeskStudentsPage';
import FrontDeskEnrollmentsPage from '@/pages/front-desk/pages/FrontDeskEnrollmentsPage';
import FrontDeskInstructorsPage from '@/pages/front-desk/pages/FrontDeskInstructorsPage';
import FrontDeskNotificationsPage from '@/pages/front-desk/pages/FrontDeskNotificationsPage';
import FrontDeskProfilePage from '@/pages/front-desk/pages/FrontDeskProfilePage';
import FrontDeskInstrumentRentalsPage from '@/pages/front-desk/pages/FrontDeskInstrumentRentalsPage';
import FrontDeskRoomBookings from '@/pages/front-desk/pages/FrontDeskRoomBookings';
import FrontDeskWalkInRoomBookingPage from '@/pages/front-desk/pages/FrontDeskWalkInRoomBookingPage';
import FrontDeskWalkInRentalPage from '@/pages/front-desk/pages/FrontDeskWalkInRentalPage';
import BillingPayments from '@/pages/front-desk/pages/FrontDeskBillingPayments';

import ClientPageLayout from '@/pages/client/layouts/ClientPageLayout';
import ClientDashboard from '@/pages/client/dashboard/pages/Dashboard';
import { ClientProfile } from '@/pages/client/profile';
import { ClientNotifications } from '@/pages/client/notifications';
import {
  Enrollments,
  CreateEnrollment,
  NewEnrollment,
  EnrollmentPaymentPage,
  EnrollmentDetails,
} from '@/pages/client/enrollments';
import {
  RoomBookings,
  CreateRoomBooking,
  RoomBookingDetails,
  RoomBookingPaymentPage,
} from '@/pages/client/room-bookings';
import {
  InstrumentRentals,
  CreateInstrumentRental,
  InstrumentRentalDetails,
  RentalPaymentPage,
} from '@/pages/client/instrument-rentals';
import {
  ClientBillingPayments,
  TransactionDetails,
} from '@/pages/client/billing';

import NotFoundPage from '@/components/page/NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />{' '}
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="front-desk/login" element={<LoginPage audience="front-desk" />} />
        <Route path="admin/login" element={<LoginPage audience="admin" />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="signup/verify" element={<EmailOtpPage />} />
        <Route path="auth/callback/success" element={<OAuthCallbackPage />} />
        <Route path="auth/callback/failure" element={<OAuthCallbackPage />} />
      </Route>

      <Route element={<AuthenticatedLayout allowedStaffType="ADMIN" />}>
        <Route path="admin">
          <Route index element={<DashboardPage />} />

          <Route path="students" element={<StudentsPage />} />
          <Route path="instructors" element={<InstructorsPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="enrollments" element={<EnrollmentsPage />} />
          <Route path="schedule" element={<ClassSchedulePage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="room-rentals" element={<RoomRentalsPage />} />
          <Route path="instruments" element={<InstrumentsPage />} />

          <Route
            path="instrument-rentals"
            element={<InstrumentRentalsPage />}
          />

          <Route path="attendance" element={<AttendancePage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="enrollment-rates" element={<EnrollmentRatesPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />

          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Route>

      <Route element={<AuthenticatedLayout allowedStaffType="FRONT_DESK" />}>
        <Route path="front-desk">
          <Route index element={<FrontDeskDashboardPage />} />

          <Route path="students" element={<FrontDeskStudentsPage />} />
          <Route path="instructors" element={<FrontDeskInstructorsPage />} />
          <Route path="enrollments" element={<FrontDeskEnrollmentsPage />} />
          <Route path="schedule" element={<FrontDeskClassSchedulePage />} />
          <Route path="schedule/manage" element={<FrontDeskClassSchedulePage />} />
          <Route path="schedule/manage-request" element={<FrontDeskClassSchedulePage />} />
          <Route path="schedule/emergency" element={<FrontDeskClassSchedulePage />} />
          <Route
            path="rentals"
            element={<FrontDeskInstrumentRentalsPage />}
          />
          <Route path="rentals/walk-in" element={<FrontDeskWalkInRentalPage />} />
          <Route path="room-bookings" element={<FrontDeskRoomBookings />} />
          <Route path="room-bookings/walk-in" element={<FrontDeskWalkInRoomBookingPage />} />
          <Route path="billing" element={<BillingPayments />} />

          <Route path="profile" element={<FrontDeskProfilePage />} />

          <Route
            path="notifications"
            element={<FrontDeskNotificationsPage />}
          />

          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route element={<AuthenticatedLayout accountType="CLIENT" />}>
        <Route
          path="client/enrollments/payment"
          element={<EnrollmentPaymentPage />}
        />
        <Route
          path="client/instrument-rentals/payment"
          element={<RentalPaymentPage />}
        />
        <Route
          path="client/room-bookings/payment"
          element={<RoomBookingPaymentPage />}
        />

        <Route path="client" element={<ClientPageLayout />}>
          <Route index element={<ClientDashboard />} />

          <Route path="profile" element={<ClientProfile />} />
          <Route path="notifications" element={<ClientNotifications />} />

          <Route path="enrollments" element={<Enrollments />} />
          <Route path="enrollments/new" element={<NewEnrollment />} />
          <Route path="enrollments/:id" element={<EnrollmentDetails />} />

          <Route path="room-bookings" element={<RoomBookings />} />
          <Route path="room-bookings/new" element={<CreateRoomBooking />} />
          <Route path="room-bookings/:id" element={<RoomBookingDetails />} />

          <Route path="instrument-rentals" element={<InstrumentRentals />} />
          <Route
            path="instrument-rentals/new"
            element={<CreateInstrumentRental />}
          />
          <Route
            path="instrument-rentals/:id"
            element={<InstrumentRentalDetails />}
          />

          <Route path="billing" element={<ClientBillingPayments />} />
          <Route path="billing/:id" element={<TransactionDetails />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
