"use client";


import { AppSidebar } from "../components/app-sidebar";
import { SiteHeader } from "../components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

    import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const payments = [
  {
    id: "PAY-001",
    student: "Maria Santos",
    description: "Piano Beginner - August",
    amount: "₱4,000",
    method: "GCash",
    date: "Aug 31, 2026",
    status: "Paid",
  },
  {
    id: "PAY-002",
    student: "Juan Dela Cruz",
    description: "Guitar Intermediate - August",
    amount: "₱4,500",
    method: "Cash",
    date: "Aug 30, 2026",
    status: "Paid",
  },
];

export default function PaymentsPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />

      <SidebarInset>
        <SiteHeader />

        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Payments</h1>

              <p className="text-muted-foreground">
                Track tuition payments and transactions.
              </p>
            </div>
           
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>

              <CardDescription>
                Recent payments made by students.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.id}
                        </TableCell>

                        <TableCell>{payment.student}</TableCell>

                        <TableCell>{payment.description}</TableCell>

                        <TableCell>{payment.amount}</TableCell>

                        <TableCell>{payment.method}</TableCell>

                        <TableCell>{payment.date}</TableCell>

                        <TableCell>
                          <Badge>{payment.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
