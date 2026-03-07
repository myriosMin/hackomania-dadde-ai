"use client";

import { CopilotPopup } from "@copilotkit/react-ui";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./context/auth-context";

export default function ClientApp() {
    return (
        <AuthProvider>
            <RouterProvider router={router} />
            <CopilotPopup
                labels={{
                    title: "AI Assistant",
                    initial: "👋 Hi! How can I help you today?",
                }}
            />
        </AuthProvider>
    );
}
