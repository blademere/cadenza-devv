import { Navigate, Outlet } from "react-router-dom";
import useAuth from "@/core/auth/useAuth";

export default function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
