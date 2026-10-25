import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  EllipsisVerticalIcon,
  CircleUserRoundIcon,
  BellIcon,
  LogOutIcon,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import useAuth from "@/core/auth/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getMyNotifications } from "@/pages/client/notifications/services/notifications.service";

export function NavUser({ user }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const displayUser = {
    ...user,
    name: authUser?.name || user?.name,
    email: authUser?.email || user?.email,
  };
  useEffect(() => {
    getMyNotifications().then((items) => {
      let readIds = [];
      try { readIds = JSON.parse(localStorage.getItem('cadenza-client-read-notifications') || '[]'); } catch { /* ignore invalid local state */ }
      setUnreadCount(items.filter((item) => !readIds.includes(item.id)).length);
    }).catch(() => setUnreadCount(0));
  }, []);

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      await logout();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error(error?.message || "Failed to log out.");
      setIsSigningOut(false);
      setLogoutDialogOpen(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-muted"
              />
            }
          >
            <Avatar className="size-8 rounded-lg grayscale">
              <AvatarImage
                src={displayUser?.avatar}
                alt={displayUser?.name || "User"}
              />

              <AvatarFallback className="rounded-lg">
                {displayUser?.name?.charAt(0)?.toUpperCase() || "CL"}
              </AvatarFallback>
            </Avatar>

            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {displayUser?.name || "Client"}
              </span>

              <span className="truncate text-xs text-foreground/70">
                {displayUser?.email || ""}
              </span>
            </div>

            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage
                      src={displayUser?.avatar}
                      alt={displayUser?.name || "User"}
                    />

                    <AvatarFallback className="rounded-lg">
                        {displayUser?.name?.charAt(0)?.toUpperCase() || "CL"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {displayUser?.name || "Client"}
                    </span>

                    <span className="truncate text-xs text-muted-foreground">
                      {displayUser?.email || ""}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => navigate("/client/profile")}
              >
                <CircleUserRoundIcon />
                Account
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/client/notifications")}
              >
                <BellIcon />
                Notifications{unreadCount > 0 && <Badge className="ml-auto">{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setLogoutDialogOpen(true)}
              disabled={isSigningOut}
            >
              <LogOutIcon />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog
        open={logoutDialogOpen}
        onOpenChange={(open) => {
          if (!isSigningOut) {
            setLogoutDialogOpen(open);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out of your account?</DialogTitle>
            <DialogDescription>
              You will need to sign in again to access your Cadenza account.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSigningOut}
              onClick={() => setLogoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSigningOut}
              onClick={handleLogout}
            >
              {isSigningOut && <Loader2 className="animate-spin" />}
              {isSigningOut ? "Signing out..." : "Log out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}

