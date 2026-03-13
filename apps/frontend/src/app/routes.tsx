import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import AppLayout from "@/components/layout/AppLayout";
import { PageLoadingFallback } from "@/components/feedback/LoadingSpinner";

const ItemsPage = lazy(() => import("@/features/items/pages/items.page"));
const OrderListPage = lazy(() => import("@/features/orders/pages/order-list.page"));
const CreateOrderPage = lazy(() => import("@/features/orders/pages/create-order.page"));
const OrderDetailPage = lazy(() => import("@/features/orders/pages/order-detail.page"));

export default function AppRoutes() {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<ItemsPage />} />
          <Route path="/orders" element={<Outlet />}>
            <Route index element={<OrderListPage />} />
            <Route path="new" element={<CreateOrderPage />} />
            <Route path=":id" element={<OrderDetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
