import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Menu,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Toaster } from "sonner";

import Overview from "./pages/Overview";
import Inventory from "./pages/Inventory";
import Suppliers from "./pages/Suppliers";
import Recipes from "./pages/Recipes";
import Reports from "./pages/Reports";
import Purchases from "./pages/Purchases";
import POS from "./pages/POS";
import { useAppData } from "./context/AppDataContext";

const navigationItems = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/pos", label: "Punto de Venta", icon: ShoppingCart },
  { to: "/inventory", label: "Inventario", icon: Package },
  { to: "/suppliers", label: "Proveedores", icon: Truck },
  { to: "/recipes", label: "Recetas", icon: BookOpen },
  { to: "/reports", label: "Reportes", icon: BarChart3 },
  { to: "/purchases", label: "Compras", icon: ClipboardList },
];

function AppReady({ children }) {
  const { isLoading, connectionError } = useAppData();

  if (isLoading) {
    return (
      <div className="app-loading-state">
        <p>
          {connectionError
            ? "No se pudo conectar con el servidor local. Verifica que el computador de escritorio esté encendido y conectado a la misma red WiFi."
            : "Conectando con el servidor local…"}
        </p>
      </div>
    );
  }

  return children;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <ChefHat size={24} strokeWidth={2.2} />
          </div>

          <div className="brand-copy">
            <p className="eyebrow">El Mesón de Los Laureles</p>
            <h1>Bienvenido</h1>
            <span>Gestión gastronómica</span>
          </div>
        </div>

        <div className="nav-section">
          <p className="nav-label">Menú principal</p>
          <nav className="nav" aria-label="Navegación principal">
            {navigationItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="nav-item-icon" aria-hidden="true">
                  <Icon size={19} strokeWidth={2} />
                </span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        {/*
        <div className="sidebar-card">
          <div className="sidebar-card-header">
            <span className="sidebar-card-icon" aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="eyebrow">Hoy</p>
              <h3>Previsión de servicio</h3>
            </div>
          </div>

          <div className="forecast-list">
            <div className="forecast-row">
              <span><Clock3 size={15} aria-hidden="true" /> Almuerzo</span>
              <strong>216 comensales</strong>
            </div>
            <div className="forecast-row">
              <span><Clock3 size={15} aria-hidden="true" /> Cena</span>
              <strong>318 comensales</strong>
            </div>
          </div>

          <div className="service-status">
            <span className="status-dot" aria-hidden="true" />
            Operación funcionando con normalidad
          </div>
        </div>
        */}
      </aside>
            {sidebarOpen && (
              <div
                className="sidebar-overlay"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
      
            <main className="main-panel">
              <button
                className="menu-toggle"
                aria-label="Abrir menú"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu size={24} strokeWidth={2} />
              </button>
              <Toaster position="top-right" richColors closeButton />
              <AppReady>
                <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/purchases" element={<Purchases />} />
        </Routes>
              </AppReady>
      </main>
    </div>
  );
}

export default App;
