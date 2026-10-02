import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import app from "@/config/app";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const navItems = [];

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground",
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    setIsOpen(false);
    navigate("/login");
  };

  const handleSignup = () => {
    setIsOpen(false);
    navigate("/signup");
  };

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 text-xl font-bold tracking-tight text-foreground"
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-full bg-primary text-lg text-primary-foreground"
            aria-hidden="true"
          >
            ♫
          </span>

          <span>{app.name}</span>
        </Link>

        <nav
          className="hidden items-center gap-2 md:flex"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} />
          ))}

          <Button variant="ghost" onClick={handleLogin}>
            Log in
          </Button>

          <Button onClick={handleSignup}>Sign up</Button>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
        >
          ☰
        </Button>
      </div>

      {isOpen && (
        <div
          id="mobile-nav"
          className="border-t border-border bg-card md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {navItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={item.label}
                onClick={() => setIsOpen(false)}
              />
            ))}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogin}
              >
                Log in
              </Button>

              <Button className="w-full" onClick={handleSignup}>
                Sign up
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
