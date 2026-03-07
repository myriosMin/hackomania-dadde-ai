import { createBrowserRouter } from "react-router";
import { Storefront } from "./pages/Storefront";
import { Checkout } from "./pages/Checkout";
import { Verification } from "./pages/Verification";
import { OrderComplete } from "./pages/OrderComplete";
import { OrderCancelled } from "./pages/OrderCancelled";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Storefront />,
  },
  {
    path: "/checkout",
    element: <Checkout />,
  },
  {
    path: "/verification",
    element: <Verification />,
  },
  {
    path: "/order-complete",
    element: <OrderComplete />,
  },
  {
    path: "/order-cancelled",
    element: <OrderCancelled />,
  },
]);