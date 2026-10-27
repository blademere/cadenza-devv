import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BellIcon, CircleUserRoundIcon, EllipsisVerticalIcon, Loader2, LogOutIcon } from 'lucide-react';
import useAuth from '@/core/auth/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

export function NavUser({ user }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const displayUser = { ...user, name: authUser?.name || user?.name, email: authUser?.email || user?.email };

  const handleLogout = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await logout();
      navigate('/staff/login', { replace: true });
    } catch (error) {
      toast.error(error?.message || 'Failed to log out.');
      setSigningOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}>
            <Avatar className="size-8 rounded-lg grayscale"><AvatarImage src={displayUser.avatar} alt={displayUser.name || 'User'} /><AvatarFallback className="rounded-lg">AD</AvatarFallback></Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{displayUser.name || 'Admin'}</span><span className="truncate text-xs text-foreground/70">{displayUser.email || ''}</span></div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuGroup><DropdownMenuLabel className="p-0 font-normal"><div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm"><Avatar className="size-8"><AvatarImage src={displayUser.avatar} alt={displayUser.name || 'User'} /><AvatarFallback className="rounded-lg">AD</AvatarFallback></Avatar><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{displayUser.name || 'Admin'}</span><span className="truncate text-xs text-muted-foreground">{displayUser.email || ''}</span></div></div></DropdownMenuLabel></DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup><DropdownMenuItem onClick={() => navigate('/admin/profile')}><CircleUserRoundIcon />Account</DropdownMenuItem><DropdownMenuItem onClick={() => navigate('/admin/notifications')}><BellIcon />Notifications<Badge className="ml-auto">3</Badge></DropdownMenuItem></DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLogoutOpen(true)} disabled={signingOut}><LogOutIcon />Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <Dialog open={logoutOpen} onOpenChange={(open) => !signingOut && setLogoutOpen(open)}>
        <DialogContent><DialogHeader><DialogTitle>Log out of your account?</DialogTitle><DialogDescription>You will need to sign in again to access the admin workspace.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={signingOut} onClick={() => setLogoutOpen(false)}>Cancel</Button><Button variant="destructive" disabled={signingOut} onClick={handleLogout}>{signingOut && <Loader2 className="animate-spin" />}{signingOut ? 'Signing out...' : 'Log out'}</Button></DialogFooter></DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
