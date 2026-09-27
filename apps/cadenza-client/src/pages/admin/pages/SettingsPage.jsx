"use client";

import * as React from "react";
import {
  Building2Icon,
  GraduationCapIcon,
  DoorOpenIcon,
  BellIcon,
  SaveIcon,
} from "lucide-react";

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

import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [settings, setSettings] = React.useState({
    centerName: "Cadenza Music Center",
    address: "Koronadal City",
    contact: "",
    email: "",

    lessonDuration: "1",
    currency: "PHP",

    enrollmentOpen: true,
    rentalEnabled: true,
    notifications: true,
  });

  const updateSetting = (field, value) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveSettings = () => {
    console.log("Settings saved:", settings);
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

            <p className="text-muted-foreground">
              Manage the basic settings for Cadenza Music Center.
            </p>
          </div>

          {/* Music Center Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2Icon className="size-5 text-primary" />

                <div>
                  <CardTitle>Music Center Information</CardTitle>

                  <CardDescription>
                    Basic information about the music center.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="centerName">Music Center Name</Label>

                <Input
                  id="centerName"
                  value={settings.centerName}
                  onChange={(event) =>
                    updateSetting("centerName", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>

                <Input
                  id="address"
                  value={settings.address}
                  onChange={(event) =>
                    updateSetting("address", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Number</Label>

                <Input
                  id="contact"
                  placeholder="Enter contact number"
                  value={settings.contact}
                  onChange={(event) =>
                    updateSetting("contact", event.target.value)
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={settings.email}
                  onChange={(event) =>
                    updateSetting("email", event.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Enrollment Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCapIcon className="size-5 text-primary" />

                <div>
                  <CardTitle>Enrollment Settings</CardTitle>

                  <CardDescription>
                    Control student enrollment availability.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Enrollment Open</p>

                  <p className="text-sm text-muted-foreground">
                    Allow new students to enroll in courses and packages.
                  </p>
                </div>

                <Switch
                  checked={settings.enrollmentOpen}
                  onCheckedChange={(value) =>
                    updateSetting("enrollmentOpen", value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Class Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCapIcon className="size-5 text-primary" />

                <div>
                  <CardTitle>Class Settings</CardTitle>

                  <CardDescription>
                    Set the default duration for lessons.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="lessonDuration">Default Lesson Duration</Label>

                <div className="flex items-center gap-2">
                  <Input
                    id="lessonDuration"
                    type="number"
                    min="1"
                    value={settings.lessonDuration}
                    onChange={(event) =>
                      updateSetting("lessonDuration", event.target.value)
                    }
                  />

                  <span className="text-sm text-muted-foreground">hour(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DoorOpenIcon className="size-5 text-primary" />

                <div>
                  <CardTitle>Rental Settings</CardTitle>

                  <CardDescription>
                    Control room and instrument rental availability.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Rentals Enabled</p>

                  <p className="text-sm text-muted-foreground">
                    Allow rooms and instruments to be rented.
                  </p>
                </div>

                <Switch
                  checked={settings.rentalEnabled}
                  onCheckedChange={(value) =>
                    updateSetting("rentalEnabled", value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellIcon className="size-5 text-primary" />

                <div>
                  <CardTitle>Notifications</CardTitle>

                  <CardDescription>
                    Configure system notifications.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">System Notifications</p>

                  <p className="text-sm text-muted-foreground">
                    Receive notifications for enrollments, payments, and
                    rentals.
                  </p>
                </div>

                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(value) =>
                    updateSetting("notifications", value)
                  }
                />
              </div>
            </CardContent>
          </Card>


          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={saveSettings}>
              <SaveIcon className="mr-2 size-4" />
              Save Settings
            </Button>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
