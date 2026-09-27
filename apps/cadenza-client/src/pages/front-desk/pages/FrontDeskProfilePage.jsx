"use client";

import * as React from "react";
import { UserIcon, MailIcon, LockIcon } from "lucide-react";

import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminProfilePage() {
  const [name, setName] = React.useState("Admin");
  const [email, setEmail] = React.useState("admin@cadenza.com");

  const handleSave = (event) => {
    event.preventDefault();

    // Connect this to your backend later.
    console.log({
      name,
      email,
    });
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
              <form onSubmit={handleSave} className="grid gap-5">
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

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="currentPassword">Current Password</Label>

                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                          id="currentPassword"
                          type="password"
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
                          className="pl-9"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
