import type { Metadata } from "next";

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { AuthProvider } from "./context/auth-context";
import { DaddeCopilot } from "./components/dadde-copilot";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackOMania",
  description: "Community-powered emergency funds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={"antialiased"}>
        <AuthProvider>
          <CopilotKit runtimeUrl="/api/copilotkit" agent="dadde_fund_agent">
            {children}
            <DaddeCopilot />
          </CopilotKit>
        </AuthProvider>
      </body>
    </html>
  );
}
