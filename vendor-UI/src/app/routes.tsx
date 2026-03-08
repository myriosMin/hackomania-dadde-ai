import { createBrowserRouter } from "react-router";
import { Storefront } from "./pages/Storefront";
import { Checkout } from "./pages/Checkout";
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
    path: "/order-complete",
    element: <OrderComplete />,
  },
  {
    path: "/order-cancelled",
    element: <OrderCancelled />,
  },
]);
