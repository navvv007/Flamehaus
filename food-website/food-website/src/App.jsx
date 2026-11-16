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
import AddressPage          from "./website/pages/AddressPage";

// Admin
import AdminLogin            from "./admin/pages/AdminLogin";
import AdminForgotPassword   from "./admin/pages/AdminForgotPassword";
import AdminLayout           from "./admin/components/AdminLayout";
import ProtectedRoute        from "./admin/components/ProtectedRoute";
import Dashboard             from "./admin/pages/Dashboard";
import AdminMenu             from "./admin/pages/AdminMenu";
import AdminOrders           from "./admin/pages/AdminOrders";
import AdminOrderDetail      from "./admin/pages/AdminOrderDetail";
import AdminUsers            from "./admin/pages/AdminUsers";
import AdminRatings          from "./admin/pages/AdminRatings";
import AdminSettings         from "./admin/pages/AdminSettings";
import AdminDeliveryPartners from "./admin/pages/AdminDeliveryPartners";
import AdminDeliveryOrders   from "./admin/pages/AdminDeliveryOrders";
import AdminCancellations    from "./admin/pages/AdminCancellations";
import AdminCoupons          from "./admin/pages/AdminCoupons";
import AdminTimeoutOrders    from "./admin/pages/AdminTimeoutOrders";
import AdminDeliveryMap      from "./admin/pages/AdminDeliveryMap";

// Delivery Partner Portal
import DeliveryLogin       from "./delivery/pages/DeliveryLogin";
import DeliveryRegister    from "./delivery/pages/DeliveryRegister";
import DeliveryDashboard   from "./delivery/pages/DeliveryDashboard";
import DeliveryEarnings    from "./delivery/pages/DeliveryEarnings";
import DeliveryOrderDetail from "./delivery/pages/DeliveryOrderDetail";

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
              <Route path="orders/:orderId"  element={<OrderDetail />} />
              <Route path="payment/:orderId" element={<PaymentPage />} />
              <Route path="payment/success"  element={<PaymentSuccess />} />
              <Route path="payment/failed"   element={<PaymentFailed />} />
              <Route path="my-addresses"     element={<AddressPage />} />
            </Route>

            {/* ── Admin standalone pages (no sidebar) ──────────────────── */}
            <Route path="/admin/login"           element={<AdminLogin />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />

            {/* ── Admin panel (protected, with sidebar) ────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute><AdminLayout /></ProtectedRoute>
            }>
              <Route index                     element={<Dashboard />} />
              <Route path="menu"               element={<AdminMenu />} />
              <Route path="orders"             element={<AdminOrders />} />
              <Route path="orders/:id"         element={<AdminOrderDetail />} />
              <Route path="users"              element={<AdminUsers />} />
              <Route path="ratings"            element={<AdminRatings />} />
              <Route path="settings"           element={<AdminSettings />} />
              <Route path="delivery/partners"  element={<AdminDeliveryPartners />} />
              <Route path="delivery/orders"    element={<AdminDeliveryOrders />} />
              <Route path="cancellations"      element={<AdminCancellations />} />
              <Route path="coupons"            element={<AdminCoupons />} />
              <Route path="timeout-orders"     element={<AdminTimeoutOrders />} />
              <Route path="delivery/map"       element={<AdminDeliveryMap />} />              
              <Route path="timeout-orders"     element={<AdminTimeoutOrders />} />
            </Route>

            {/* ── Delivery Partner Portal ───────────────────────────────── */}
            <Route path="/delivery/login"     element={<DeliveryLogin />} />
            <Route path="/delivery/register"  element={<DeliveryRegister />} />
            <Route path="earnings"           element={<DeliveryEarnings />} />
            <Route path="orders/:assignmentId" element={<DeliveryOrderDetail />} />
            <Route path="track/:assignmentId"  element={<DeliveryOrderDetail />} />
            <Route path="/delivery/*" element={<Navigate to="/delivery/dashboard" replace />} />

            {/*
              /delivery/dashboard is the main page after login.
              DeliveryLogin calls: window.location.href = "/delivery/dashboard"
              DeliveryDashboard has all features: stats, active order, map, history.
            */}
            <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
            {/* Legacy redirect — /delivery/orders also goes to dashboard */}
            <Route path="/delivery/orders"    element={<Navigate to="/delivery/dashboard" />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
