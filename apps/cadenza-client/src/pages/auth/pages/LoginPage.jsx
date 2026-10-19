import { LoginForm } from "@/pages/auth/components/login-form";

export default function LoginPage({ audience = 'client' }) {
  return <LoginForm audience={audience} />;
}
