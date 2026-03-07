import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/landing-page";
import { PaymentPage } from "./pages/payment-page";
import { MyGivingPage } from "./pages/my-giving-page";
import { LoginPage } from "./pages/login-page";
import { SignupPage } from "./pages/signup-page";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";
import { CommunityImpactPage } from "./pages/community-impact-page";
import { NotFoundPage } from "./pages/not-found-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/payment/:campaignId",
    Component: PaymentPage,
  },
  {
    path: "/my-giving",
    Component: MyGivingPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignupPage,
  },
  {
    path: "/admin",
    Component: AdminDashboardPage,
  },
  {
    path: "/impact",
    Component: CommunityImpactPage,
  },
  {
    path: "*",
    Component: NotFoundPage,
  },
]);