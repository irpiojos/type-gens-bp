import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Team Tasks Manager",
  description: "Weekly team planning for Historians",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full text-ink">{/* fonts via @font-face in globals.css */}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}