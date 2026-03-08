"use client";

import { useRouter } from "next/navigation";
import { useFrontendTool } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import { useAuth } from "../context/auth-context";

/**
 * DaddeCopilot — floating chat bubble (bottom-right corner) powered by the
 * dadde_fund_agent CopilotKit backend.
 *
 * Registers frontend tools that let the AI agent:
 *  - Navigate pages
 *  - Update donation preferences
 *  - Set spending caps
 *  - Manage subscriptions
 *  - Toggle notifications
 *  - Control leaderboard visibility
 */
export function DaddeCopilot() {
    const router = useRouter();
    const { updateProfile, updatePreferences, isAuthenticated } = useAuth();

    // ── Navigation ─────────────────────────────────────────────────────────────

    useFrontendTool({
        name: "navigate_to",
        description: "Navigate the app to a specific page path.",
        parameters: [
            {
                name: "path",
                type: "string",
                description:
                    "The Next.js route path to navigate to e.g. /settings, /my-giving, /impact, /payment/collective",
                required: true,
            },
        ],
        handler({ path }: { path: string }) {
            router.push(path);
        },
    });

    useFrontendTool({
        name: "navigate_to_donate",
        description:
            "Navigate to the donation/payment page for a specific campaign or the collective fund.",
        parameters: [
            {
                name: "campaign_id",
                type: "string",
                description:
                    "The campaign ID to donate to. Use 'collective' for the general disaster fund.",
                required: true,
            },
            {
                name: "amount",
                type: "number",
                description: "Pre-filled donation amount in USD.",
                required: false,
            },
            {
                name: "donation_type",
                type: "string",
                description: "Either 'one-time' or 'recurring'.",
                required: false,
            },
        ],
        handler({
            campaign_id,
            amount,
            donation_type,
        }: {
            campaign_id: string;
            amount?: number;
            donation_type?: string;
        }) {
            const params = new URLSearchParams();
            if (amount) params.set("amount", amount.toString());
            if (donation_type) params.set("type", donation_type);

            const query = params.toString() ? `?${params.toString()}` : '';
            router.push(`/payment/${campaign_id}${query}`);
        },
    });

    // ── Donation Preferences ────────────────────────────────────────────────────

    useFrontendTool({
        name: "update_preferences",
        description:
            "Update the user's donation preferences — which disaster types and geographic regions they want to donate to.",
        parameters: [
            {
                name: "disaster_types",
                type: "string",
                description:
                    "Comma-separated disaster types. Valid values: ALL, FLOOD, EARTHQUAKE, WILDFIRE, TYPHOON, DROUGHT, TSUNAMI",
                required: false,
            },
            {
                name: "geographic_regions",
                type: "string",
                description:
                    "Comma-separated geographic regions. Valid values: GLOBAL, ASIA_PACIFIC, AMERICAS, EUROPE, MIDDLE_EAST, AFRICA",
                required: false,
            },
        ],
        async handler({
            disaster_types,
            geographic_regions,
        }: {
            disaster_types?: string;
            geographic_regions?: string;
        }) {
            console.log("[DaddeCopilot] update_preferences called:", { disaster_types, geographic_regions });
            if (!isAuthenticated) return { error: "User not logged in" };

            const updates: Record<string, unknown> = {};
            if (disaster_types) {
                updates.disaster_types = disaster_types
                    .split(",")
                    .map((s) => s.trim().toUpperCase())
                    .filter(Boolean);
            }
            if (geographic_regions) {
                updates.geographic_regions = geographic_regions
                    .split(",")
                    .map((s) => s.trim().toUpperCase())
                    .filter(Boolean);
            }

            const { error } = await updatePreferences(updates as Parameters<typeof updatePreferences>[0]);
            return error ? { error } : { success: true };
        },
    });

    // ── Spending Caps ──────────────────────────────────────────────────────────

    useFrontendTool({
        name: "set_spending_caps",
        description:
            "Update the user's spending limits for automatic micro-donations.",
        parameters: [
            {
                name: "roundup_limit",
                type: "number",
                description: "Maximum round-up amount per transaction in USD.",
                required: false,
            },
            {
                name: "daily_cap",
                type: "number",
                description: "Maximum total automatic donations per day in USD.",
                required: false,
            },
            {
                name: "weekly_cap",
                type: "number",
                description: "Maximum total automatic donations per week in USD.",
                required: false,
            },
            {
                name: "monthly_cap",
                type: "number",
                description: "Maximum total automatic donations per month in USD.",
                required: false,
            },
        ],
        async handler({
            roundup_limit,
            daily_cap,
            weekly_cap,
            monthly_cap,
        }: {
            roundup_limit?: number;
            daily_cap?: number;
            weekly_cap?: number;
            monthly_cap?: number;
        }) {
            console.log("[DaddeCopilot] set_spending_caps called:", { roundup_limit, daily_cap, weekly_cap, monthly_cap });
            if (!isAuthenticated) return { error: "User not logged in" };

            const updates: Record<string, unknown> = {};
            // Safely parse numbers in case LLM sends strings
            if (roundup_limit !== undefined && roundup_limit !== null) updates.roundup_limit_per_tx = parseFloat(roundup_limit as any);
            if (daily_cap !== undefined && daily_cap !== null) updates.daily_micro_cap = parseFloat(daily_cap as any);
            if (weekly_cap !== undefined && weekly_cap !== null) updates.weekly_micro_cap = parseFloat(weekly_cap as any);
            if (monthly_cap !== undefined && monthly_cap !== null) updates.monthly_micro_cap = parseFloat(monthly_cap as any);

            const { error } = await updatePreferences(updates as Parameters<typeof updatePreferences>[0]);
            return error ? { error } : { success: true };
        },
    });

    // ── Subscription / Monthly Pledge ──────────────────────────────────────────

    useFrontendTool({
        name: "set_subscription",
        description:
            "Set or cancel the user's recurring subscription pledge. Set amount to 0 to cancel.",
        parameters: [
            {
                name: "amount",
                type: "number",
                description:
                    "Monthly pledge amount in USD. Set to 0 to cancel the subscription.",
                required: true,
            },
            {
                name: "interval",
                type: "string",
                description:
                    "ISO 8601 duration interval: P1W (weekly), P1M (monthly), P3M (quarterly). Defaults to P1M.",
                required: false,
            },
        ],
        async handler({
            amount,
            interval = "P1M",
        }: {
            amount: number;
            interval?: string;
        }) {
            console.log("[DaddeCopilot] set_subscription called with:", { amount, interval });
            if (!isAuthenticated) return { error: "User not logged in" };

            const parsedAmount = parseFloat(amount as any);
            if (isNaN(parsedAmount)) {
                return { error: "Invalid amount provided" };
            }

            const { error } = await updatePreferences({
                subscription_amount: parsedAmount,
                subscription_interval: interval,
            });
            return error ? { error } : { success: true, amount: parsedAmount, interval };
        },
    });

    // ── Notification Settings ──────────────────────────────────────────────────

    useFrontendTool({
        name: "set_notifications",
        description:
            "Enable or disable email and/or push notification preferences for the user.",
        parameters: [
            {
                name: "email_enabled",
                type: "boolean",
                description: "Whether to receive email notifications.",
                required: false,
            },
            {
                name: "push_enabled",
                type: "boolean",
                description: "Whether to receive push notifications.",
                required: false,
            },
        ],
        async handler({
            email_enabled,
            push_enabled,
        }: {
            email_enabled?: boolean;
            push_enabled?: boolean;
        }) {
            if (!isAuthenticated) return { error: "User not logged in" };

            const updates: Record<string, unknown> = {};
            if (email_enabled !== undefined) updates.notification_email = email_enabled;
            if (push_enabled !== undefined) updates.notification_push = push_enabled;

            const { error } = await updateProfile(updates as Parameters<typeof updateProfile>[0]);
            return error ? { error } : { success: true };
        },
    });

    // ── Leaderboard Visibility ─────────────────────────────────────────────────

    useFrontendTool({
        name: "set_leaderboard_visibility",
        description:
            "Show or hide the user's name on the public donor leaderboard.",
        parameters: [
            {
                name: "visible",
                type: "boolean",
                description: "true to show on leaderboard, false to hide.",
                required: true,
            },
        ],
        async handler({ visible }: { visible: boolean }) {
            if (!isAuthenticated) return { error: "User not logged in" };

            const { error } = await updateProfile({ is_leaderboard_visible: visible });
            return error ? { error } : { success: true, visible };
        },
    });

    // ── Render chat bubble ─────────────────────────────────────────────────────

    return (
        <CopilotPopup
            instructions="You are Dadde, the AI assistant for Dadde's Fund. Help users understand the platform and control their settings using natural language."
            defaultOpen={false}
            labels={{
                title: "Dadde Assistant 🌊",
                initial:
                    "Hi! I'm Dadde, your personal assistant for Dadde's Fund 👋\n\nI can help you:\n• **Understand** how our community disaster fund works\n• **Change** your donation preferences and spending limits\n• **Manage** your subscription or make a donation\n• **Navigate** anywhere in the app\n\nWhat would you like to do?",
                placeholder: "Ask me anything about Dadde's Fund...",
            }}
            icons={{
                openIcon: <DaddeChatIcon />,
            }}
            suggestions={[
                {
                    title: "🌊 What is Dadde's Fund?",
                    message: "What is Dadde's Fund and how does it work?",
                },
                {
                    title: "💳 Make a donation",
                    message: "I want to donate $50 to the collective fund",
                },
                {
                    title: "⚙️ Update preferences",
                    message: "Change my disaster preference to floods and earthquakes only",
                },
                {
                    title: "📅 Set up subscription",
                    message: "Set up a monthly pledge of $20",
                },
                {
                    title: "🔕 Notifications",
                    message: "Turn off push notifications",
                },
                {
                    title: "💰 Set spending cap",
                    message: "Set my monthly spending cap to $100",
                },
            ]}
        />
    );
}

/** Custom teal wave icon for the chat bubble trigger */
function DaddeChatIcon() {
    return (
        <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M14 2C7.373 2 2 7.373 2 14c0 2.09.54 4.055 1.487 5.766L2 26l6.416-1.45A11.94 11.94 0 0014 26c6.627 0 12-5.373 12-12S20.627 2 14 2z"
                fill="white"
                opacity="0.9"
            />
            <path
                d="M8 13.5c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0"
                stroke="#0d9488"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M8 17c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0"
                stroke="#0d9488"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.5"
            />
        </svg>
    );
}
