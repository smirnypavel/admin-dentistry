import { Layout } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { ProductsPage } from "./pages/ProductsPage.tsx";
import { OrdersPage } from "./pages/OrdersPage.tsx";
import { OrderDetailsPage } from "./pages/OrderDetailsPage.tsx";
import OrderPrintPage from "./pages/OrderPrintPage.tsx";
import { CategoriesPage } from "./pages/CategoriesPage.tsx";
import { ManufacturersPage } from "./pages/ManufacturersPage.tsx";
import { CountriesPage } from "./pages/CountriesPage.tsx";
import { AdminUsersPage } from "./pages/AdminUsersPage.tsx";
import { DiscountsPage } from "./pages/DiscountsPage.tsx";
import { ContactsPage } from "./pages/ContactsPage.tsx";
import { HeroPage } from "./pages/HeroPage.tsx";
import { ProtectedRoute } from "./routes/ProtectedRoute.tsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: "100vh" }}>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id/print"
            element={
              <ProtectedRoute>
                <OrderPrintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discounts"
            element={
              <ProtectedRoute>
                <DiscountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manufacturers"
            element={
              <ProtectedRoute>
                <ManufacturersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/countries"
            element={
              <ProtectedRoute>
                <CountriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <ContactsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hero"
            element={
              <ProtectedRoute>
                <HeroPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admins"
            element={
              <ProtectedRoute>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
