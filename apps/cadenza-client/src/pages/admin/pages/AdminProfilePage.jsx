"use client";

import * as React from "react";
import { UserIcon, MailIcon, LockIcon } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getMyProfile, updateMyProfile, updateMyPassword } from "@/services/profileService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

export default function AdminProfilePage() {
  const [name, setName] = React.useState("Admin");
  const [email, setEmail] = React.useState("admin@cadenza.com");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState("");
  const [passwordMessage, setPasswordMessage] = React.useState("");
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileMessage, setProfileMessage] = React.useState("");
  const [profileError, setProfileError] = React.useState("");
  const [passwordConfirmOpen, setPasswordConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    getMyProfile()
      .then((profile) => {
        const person = profile?.person || {};
        setName([person.firstName, person.lastName].filter(Boolean).join(' ') || 'Admin');
        setEmail(profile?.user?.email || person.email || '');
      })
      .catch((error) => setProfileError(error?.response?.data?.message || 'Unable to load profile information.'))
      .finally(() => setProfileLoading(false));
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();

    setProfileError("");
    setProfileMessage("");
    const [firstName, ...lastParts] = name.trim().split(/\s+/);
    if (!firstName || !lastParts.join(' ') || !email.trim()) {
      setProfileError('Enter a full name and email address.');
      return;
    }
    try {
      setProfileLoading(true);
      const updated = await updateMyProfile({
        firstName,
        lastName: lastParts.join(' '),
        email: email.trim(),
      });
      const updatedPerson = updated?.person || {};
      setName([updatedPerson.firstName, updatedPerson.lastName].filter(Boolean).join(' '));
      setEmail(updated?.user?.email || updatedPerson.email || email.trim());
      setProfileMessage('Profile information updated successfully.');
    } catch (error) {
      setProfileError(error?.message || 'Unable to update profile information.');
    } finally {
      setProfileLoading(false);
    }
  };

  const requestPasswordChange = (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("The new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    setPasswordConfirmOpen(true);
  };

  const handleChangePassword = async () => {
    try {
      setPasswordLoading(true);
      await updateMyPassword(currentPassword, newPassword);
      setPasswordMessage("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordConfirmOpen(false);
    } catch (error) {
      setPasswordError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to change your password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin Profile
            </h1>

            <p className="text-muted-foreground">
              Manage your profile information and password.
            </p>
          </div>

          {/* Profile */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>

              <CardDescription>
                Update the administrator information for your account.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-5">
                {profileError && <p className="text-sm text-destructive">{profileError}</p>}
                {profileMessage && <p className="text-sm text-green-600">{profileMessage}</p>}
                {/* Name */}
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>

                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="pl-9"
                      placeholder="Admin"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>

                  <div className="relative">
                    <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-9"
                      placeholder="admin@cadenza.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="border-t pt-5">
                  <div className="mb-4">
                    <h3 className="font-medium">Change Password</h3>

                    <p className="text-sm text-muted-foreground">
                      Change your password if needed.
                    </p>
                  </div>

                  <form onSubmit={requestPasswordChange} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="currentPassword">Current Password</Label>

                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          className="pl-9"
                          placeholder="Current password"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="newPassword">New Password</Label>

                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          id="newPassword"
                          type="password"
                          minLength={8}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="pl-9"
                          placeholder="New password"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>

                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="pl-9"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                    {passwordMessage && <p className="text-sm text-green-600">{passwordMessage}</p>}
                    <Button type="submit" disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}>
                      {passwordLoading ? "Changing password..." : "Change Password"}
                    </Button>
                  </form>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={handleSave} disabled={profileLoading}>Save Changes</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Dialog open={passwordConfirmOpen} onOpenChange={(open) => !passwordLoading && setPasswordConfirmOpen(open)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm password change</DialogTitle>
                <DialogDescription>
                  Are you sure you want to change the Admin account password?
                  You will remain signed in after the change.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={passwordLoading} onClick={() => setPasswordConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={passwordLoading} onClick={handleChangePassword}>
                  {passwordLoading ? "Changing..." : "Confirm change"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
