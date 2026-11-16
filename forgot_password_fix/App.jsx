import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider }  from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";

// Website
import WebsiteLayout        from "./website/components/WebsiteLayout";
import Home                 from "./website/pages/Home";
import Menu                 from "./website/pages/Menu";
import CartPage             from "./website/pages/CartPage";
import About                from "./website/pages/About";
import Login                from "./website/pages/Login";
import Register             from "./website/pages/Register";
import ForgotPassword       from "./website/pages/ForgotPassword";
import MyOrders             from "./website/pages/MyOrders";
import OrderDetail          from "./website/pages/OrderDetail";
import PaymentPage          from "./website/pages/PaymentPage";
import PaymentSuccess       from "./website/pages/PaymentSuccess";
import PaymentFailed        from "./website/pages/PaymentFailed";

// Admin
import AdminLogin           from "./admin/pages/AdminLogin";
import AdminForgotPassword  from "./admin/pages/AdminForgotPassword";
import AdminLayout          from "./admin/components/AdminLayout";
import ProtectedRoute       from "./admin/components/ProtectedRoute";
import Dashboard            from "./admin/pages/Dashboard";
import AdminMenu            from "./admin/pages/AdminMenu";
import AdminOrders          from "./admin/pages/AdminOrders";
import AdminOrderDetail     from "./admin/pages/AdminOrderDetail";
import AdminUsers           from "./admin/pages/AdminUsers";
import AdminRatings         from "./admin/pages/AdminRatings";
import AdminSettings        from "./admin/pages/AdminSettings";

import "./index.css";

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>

            {/* ── Website ──────────────────────────────────────────────── */}
            <Route path="/" element={<WebsiteLayout />}>
              <Route index                   element={<Home />} />
              <Route path="menu"             element={<Menu />} />
              <Route path="cart"             element={<CartPage />} />
              <Route path="about"            element={<About />} />
              <Route path="login"            element={<Login />} />
              <Route path="register"         element={<Register />} />
              <Route path="forgot-password"  element={<ForgotPassword />} />
              <Route path="my-orders"        element={<MyOrders />} />
              <Route path="orders/:id"       element={<OrderDetail />} />
              <Route path="payment/:orderId" element={<PaymentPage />} />
              <Route path="payment/success"  element={<PaymentSuccess />} />
              <Route path="payment/failed"   element={<PaymentFailed />} />
            </Route>

            {/* ── Admin standalone pages (no sidebar) ──────────────────── */}
            <Route path="/admin/login"           element={<AdminLogin />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />

            {/* ── Admin panel (protected, with sidebar) ────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute><AdminLayout /></ProtectedRoute>
            }>
              <Route index              element={<Dashboard />} />
              <Route path="menu"        element={<AdminMenu />} />
              <Route path="orders"      element={<AdminOrders />} />
              <Route path="orders/:id"  element={<AdminOrderDetail />} />
              <Route path="users"       element={<AdminUsers />} />
              <Route path="ratings"     element={<AdminRatings />} />
              <Route path="settings"    element={<AdminSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
