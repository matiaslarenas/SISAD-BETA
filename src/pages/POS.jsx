import { useState, useMemo } from "react";
import {
  Store,
  DollarSign,
  TrendingUp,
  Receipt,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  CreditCard,
  Utensils,
  ShoppingBag,
} from "lucide-react";

import MetricCard from "../components/MetricCard";
import SearchBar from "../components/SearchBar";
import FilterSelect from "../components/FilterSelect";
import { useAppData } from "../context/AppDataContext";
import { formatCurrency, calculateMargin, calculateProfit } from "../utils/recipeCalculator";
import { calculateRecipeMaxPortions } from "../utils/recipeCalculator";
import { formatDisplayDate, getTodayISODate } from "../state/appState";
import { hasValidationErrors, validateSaleForm } from "../utils/validation";
import { toast } from "sonner";

const PAYMENT_OPTIONS = [
  "Tarjeta / Débito",
  "Efectivo",
  "Transferencia",
];

export default function POS() {
  const {
    recipes,
    inventory,
    sales,
    saveTicket,
    closeTicket,
    generateSaleId,
    voidSale,
  } = useAppData();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [activeTab, setActiveTab] = useState("pos"); // 'pos' | 'history'

  // Current Ticket State
  const [ticketItems, setTicketItems] = useState([]);
  const [tableOrCustomer, setTableOrCustomer] = useState("Mesa 1");
  const [paymentMethod, setPaymentMethod] = useState("Tarjeta / Débito");
  const [ticketNotes, setTicketNotes] = useState("");
  // Referencia a la mesa/pedido pendiente cargado en pantalla (null = ticket nuevo)
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(["Todas"]);
    recipes
      .filter((r) => r.type !== "base_recipe")
      .forEach((r) => r.category && set.add(r.category));
    inventory
      .filter((i) => i.type === "resale")
      .forEach((i) => i.category && set.add(i.category));
    return Array.from(set);
  }, [recipes, inventory]);

  // Combine sellable items: recipes + resale products
  const sellableItems = useMemo(() => {
    const list = [];

    // Recipes (sub-recipes / preparation bases are excluded: they
    // are internal kitchen preparations, not orderable menu items)
    recipes
      .filter((recipe) => recipe.type !== "base_recipe")
      .forEach((recipe) => {
        const maxPortions = calculateRecipeMaxPortions(
          recipe,
          inventory,
          recipes
        );
        list.push({
          id: recipe.id,
          type: "recipe",
          name: recipe.name,
          category: recipe.category || "Pizzas",
          salePrice: recipe.salePrice || 0,
          servings: recipe.servings || 1,
          maxPortions,
          ingredientsCount: recipe.ingredients?.length || 0,
          raw: recipe,
        });
      });

    // Resale direct products (e.g. bottled drinks)
    inventory
      .filter((item) => item.type === "resale")
      .forEach((product) => {
        list.push({
          id: product.id,
          type: "product",
          name: product.item,
          category: product.category || "Bebidas",
          salePrice: Math.round(product.costPerUnit * 1.6),
          servings: 1,
          maxPortions: Math.max(0, product.onHand),
          ingredientsCount: 1,
          raw: product,
        });
      });

    return list;
  }, [recipes, inventory]);

  // Filtered menu
  const filteredItems = useMemo(() => {
    return sellableItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "Todas" ||
        item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [sellableItems, search, selectedCategory]);

  // Ticket calculations
  const ticketTotals = useMemo(() => {
    let totalAmount = 0;
    let totalCost = 0;

    ticketItems.forEach((item) => {
      totalAmount += item.quantity * item.salePrice;
      // Calculate unit cost
      let unitCost = 0;
      if (item.type === "recipe") {
        const recipe = recipes.find((r) => r.id === item.id);
        if (recipe) {
          unitCost = (recipe.ingredients || []).reduce((sum, ing) => {
            const p = inventory.find((inv) => inv.id === ing.productId);
            if (!p) return sum;
            const factor =
              ing.unit === "gr" && p.purchaseUnit === "kg"
                ? ing.quantity / 1000
                : ing.unit === "ml" && p.purchaseUnit === "lt"
                  ? ing.quantity / 1000
                  : ing.quantity;
            return sum + (p.costPerUnit || 0) * factor;
          }, 0);
        }
      } else {
        const p = inventory.find((inv) => inv.id === item.id);
        unitCost = p?.costPerUnit || 0;
      }
      totalCost += item.quantity * unitCost;
    });

    const profit = totalAmount - totalCost;
    const margin = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

    return { totalAmount, totalCost, profit, margin };
  }, [ticketItems, recipes, inventory]);

  // Daily POS Metrics
  const todayISO = getTodayISODate();

  const todaySales = useMemo(
    () => sales.filter(
      (s) => s.date === todayISO && s.status === "completed"
    ),
    [sales, todayISO]
  );

  const completedSales = useMemo(
    () => sales.filter(
      (s) => s.status === "completed"
    ),
    [sales]
  );

  // Mesas/pedidos activos: tickets guardados como pendientes (stock ya
  // reservado) que aún no se han cobrado.
  const pendingTickets = useMemo(
    () => sales.filter(
      (s) => s.status === "pending"
    ),
    [sales]
  );

  const posMetrics = useMemo(() => {
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const avgTicket = todaySales.length > 0 ? todayRevenue / todaySales.length : 0;

    return [
      {
        title: "Ventas Hoy",
        value: todaySales.length,
        trend: `${completedSales.length} totales`,
        icon: Receipt,
      },
      {
        title: "Ingresos Hoy",
        value: formatCurrency(todayRevenue),
        trend: "Ingresos brutos",
        icon: DollarSign,
      },
      {
        title: "Ticket Promedio",
        value: formatCurrency(avgTicket),
        trend: "Por venta hoy",
        icon: TrendingUp,
      },
      {
        title: "Mesas Activas",
        value: pendingTickets.length,
        trend: "Pendientes por cobrar",
        icon: Store,
      },
    ];
  }, [todaySales, completedSales, pendingTickets]);

  // Ticket actions
  const handleAddItem = (item) => {
    setTicketItems((prev) => {
      const existing = prev.find((t) => t.id === item.id && t.type === item.type);
      if (existing) {
        return prev.map((t) =>
          t.id === item.id && t.type === item.type
            ? { ...t, quantity: t.quantity + 1 }
            : t
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          type: item.type,
          name: item.name,
          salePrice: item.salePrice,
          quantity: 1,
        },
      ];
    });
    setSuccessMessage("");
  };

  const handleUpdateQty = (id, type, delta) => {
    setTicketItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id && item.type === type) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const handleRemoveItem = (id, type) => {
    setTicketItems((prev) =>
      prev.filter((item) => !(item.id === id && item.type === type))
    );
  };

  const handleClearTicket = () => {
    setTicketItems([]);
    setErrors({});
    setSuccessMessage("");
  };

  // Limpia por completo la pantalla de edición (nuevo ticket en blanco)
  const resetCurrentForm = () => {
    setTicketItems([]);
    setTableOrCustomer(`Mesa ${pendingTickets.length + 1}`);
    setPaymentMethod("Tarjeta / Débito");
    setTicketNotes("");
    setActiveTicketId(null);
    setErrors({});
  };

  // Carga una mesa/pedido pendiente en pantalla para agregar productos o cobrar
  const handleSelectPendingTicket = (ticket) => {
    setActiveTicketId(ticket.id);
    setTableOrCustomer(ticket.tableOrCustomer);
    setPaymentMethod(ticket.paymentMethod || "Tarjeta / Débito");
    setTicketNotes(ticket.notes || "");
    setTicketItems(
      ticket.items.map((item) => ({
        id: item.itemId,
        type: item.type,
        name: item.name,
        salePrice: item.unitPrice,
        quantity: item.quantity,
      }))
    );
    setErrors({});
    setSuccessMessage("");
  };

  // Guarda la mesa/pedido actual como pendiente (comanda enviada a cocina):
  // el stock se reserva de inmediato, pero la venta aún no se cobra.
  const handleSaveTicket = () => {
    const salePayload = {
      tableOrCustomer,
      paymentMethod,
      items: ticketItems.map((item) => ({
        type: item.type,
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.salePrice,
      })),
      notes: ticketNotes,
    };

    const validationErrors = validateSaleForm(salePayload);
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      toast.error("Por favor completa los datos obligatorios del pedido.");
      return;
    }

    const ticketId = activeTicketId || generateSaleId();
    saveTicket({ id: ticketId, ...salePayload });

    toast.success(`Pedido guardado para ${tableOrCustomer}`, {
      description: "Stock reservado. La mesa quedó activa para seguir agregando productos o cobrar.",
    });
    resetCurrentForm();
  };

  const handleCompleteSale = (e) => {
    e.preventDefault();

    const salePayload = {
      tableOrCustomer,
      paymentMethod,
      items: ticketItems.map((item) => ({
        type: item.type,
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.salePrice,
      })),
      notes: ticketNotes,
    };

    const validationErrors = validateSaleForm(salePayload);
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      toast.error("Por favor completa los datos obligatorios de la venta.");
      return;
    }

    // Sincroniza el ticket (crea o actualiza) con los ítems actuales y
    // luego lo cierra: garantiza que el stock descontado siempre coincide
    // con lo que finalmente se cobró, venga o no de una mesa pendiente.
    const ticketId = activeTicketId || generateSaleId();
    saveTicket({ id: ticketId, ...salePayload });
    closeTicket({ saleId: ticketId, paymentMethod, notes: ticketNotes });

    toast.success(`¡Venta registrada con éxito!`, {
      description: `${tableOrCustomer} • ${formatCurrency(ticketTotals.totalAmount)} (Stock descontado)`,
    });
    setSuccessMessage(`¡Venta registrada con éxito! Stock descontado automáticamente.`);
    resetCurrentForm();
    setTimeout(() => setSuccessMessage(""), 4500);
  };

  const handleCancelPendingTicket = (saleId) => {
    if (window.confirm(`¿Anular el pedido pendiente ${saleId}? Se reintegrará el stock reservado.`)) {
      voidSale(saleId);
      if (activeTicketId === saleId) {
        resetCurrentForm();
      }
      toast.info(`Pedido ${saleId} anulado`, {
        description: "Los ingredientes reservados han sido reintegrados al inventario.",
      });
    }
  };

  const handleVoidSale = (saleId) => {
    if (window.confirm(`¿Estás seguro de anular la venta ${saleId}? Se reintegrará el stock de los ingredientes.`)) {
      voidSale(saleId);
      toast.info(`Venta ${saleId} anulada`, {
        description: "Los ingredientes han sido reintegrados al inventario.",
      });
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Punto de Venta</p>
          <h2>Caja & Ventas</h2>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className={activeTab === "pos" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("pos")}
          >
            <ShoppingBag size={18} style={{ marginRight: 6 }} />
            Pantalla Ventas
          </button>
          <button
            type="button"
            className={activeTab === "history" ? "primary-btn" : "secondary-btn"}
            onClick={() => setActiveTab("history")}
          >
            <Receipt size={18} style={{ marginRight: 6 }} />
            Historial ({completedSales.length})
          </button>
        </div>
      </header>

      <section className="metrics-grid">
        {posMetrics.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
            icon={metric.icon}
          />
        ))}
      </section>

      {successMessage && (
        <div className="alert-item success" role="alert" style={{ marginBottom: 16 }}>
          <strong>Operación Exitosa</strong>
          <span>{successMessage}</span>
        </div>
      )}

      {activeTab === "pos" && (
        <section className="panel pending-tickets-panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <h3>Mesas / Pedidos Activos</h3>
            <span className="pill neutral">{pendingTickets.length} en curso</span>
          </div>

          <div className="pending-tickets-row">
            <button
              type="button"
              className={`ticket-chip new-ticket-chip ${!activeTicketId ? "active" : ""}`}
              onClick={resetCurrentForm}
            >
              <Plus size={14} style={{ marginRight: 4 }} />
              Nuevo Pedido
            </button>

            {pendingTickets.length === 0 ? (
              <span className="ticket-chip-empty">No hay mesas pendientes por cobrar.</span>
            ) : (
              pendingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`ticket-chip ${activeTicketId === ticket.id ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="ticket-chip-main"
                    onClick={() => handleSelectPendingTicket(ticket)}
                  >
                    <strong>{ticket.tableOrCustomer}</strong>
                    <span>{formatCurrency(ticket.totalAmount)}</span>
                  </button>
                  <button
                    type="button"
                    className="ticket-chip-cancel"
                    onClick={() => handleCancelPendingTicket(ticket.id)}
                    aria-label={`Anular pedido de ${ticket.tableOrCustomer}`}
                    title="Anular pedido"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeTab === "pos" ? (
        <div className="pos-layout">
          {/* Left Column: Menu Selector */}
          <section className="panel pos-menu-panel">
            <div className="panel-header">
              <h3>Carta & Productos Disponibles</h3>
              <span className="pill neutral">{filteredItems.length} opciones</span>
            </div>

            <div className="filters-row" style={{ marginBottom: 18 }}>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Buscar plato o bebida..."
                label="Buscar ítem"
              />
              <FilterSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={categories}
                label="Categoría"
              />
            </div>

            <div className="pos-items-grid">
              {filteredItems.map((item) => {
                const isOutOfStock = item.maxPortions <= 0;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`pos-item-card ${isOutOfStock ? "out-of-stock" : ""}`}
                    onClick={() => !isOutOfStock && handleAddItem(item)}
                    role="button"
                    tabIndex={isOutOfStock ? -1 : 0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (!isOutOfStock) handleAddItem(item);
                      }
                    }}
                  >
                    <div className="pos-item-header">
                      <span className="pill neutral" style={{ fontSize: "0.72rem" }}>
                        {item.category}
                      </span>
                      <span
                        className={`pos-stock-badge ${isOutOfStock
                          ? "stock-out"
                          : item.maxPortions <= 3
                            ? "stock-low"
                            : "stock-ok"
                          }`}
                      >
                        {isOutOfStock
                          ? "Sin stock"
                          : `${item.maxPortions} disp.`}
                      </span>
                    </div>

                    <h4 className="pos-item-title">{item.name}</h4>

                    <div className="pos-item-footer">
                      <strong className="pos-item-price">
                        {formatCurrency(item.salePrice)}
                      </strong>
                      <button
                        type="button"
                        className="mini-btn add-btn"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(item);
                        }}
                        aria-label={`Agregar ${item.name} al ticket`}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Column: Ticket / Cart */}
          <section className="panel pos-ticket-panel">
            <div className="panel-header">
              <h3>
                Ticket Actual
                {activeTicketId && (
                  <span className="pill neutral" style={{ marginLeft: 8, fontSize: "0.72rem" }}>
                    Editando pedido activo
                  </span>
                )}
              </h3>
              {ticketItems.length > 0 && (
                <button
                  type="button"
                  className="mini-btn"
                  onClick={handleClearTicket}
                  title="Vaciar ticket"
                >
                  Vaciar
                </button>
              )}
            </div>

            <form onSubmit={handleCompleteSale} noValidate>
              {hasValidationErrors(errors) && (
                <div className="form-alert" role="alert" style={{ marginBottom: 12 }}>
                  {errors.items || errors.tableOrCustomer || errors.paymentMethod || "Revisa el ticket antes de continuar."}
                </div>
              )}

              <div className="form-grid" style={{ marginBottom: 14 }}>
                <label className="form-field">
                  <span>Mesa / Identificador</span>
                  <input
                    type="text"
                    className="search-input"
                    value={tableOrCustomer}
                    placeholder="Ej. Mesa 3, Barra, Delivery"
                    onChange={(e) => setTableOrCustomer(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Método de Pago</span>
                  <select
                    className="search-input"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {PAYMENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ticket-items-container">
                {ticketItems.length === 0 ? (
                  <div className="ticket-empty-state">
                    <ShoppingBag size={38} style={{ opacity: 0.35, marginBottom: 8 }} />
                    <p>El ticket está vacío</p>
                    <span>Selecciona productos o recetas de la carta para agregarlos.</span>
                  </div>
                ) : (
                  <ul className="ticket-items-list">
                    {ticketItems.map((item) => (
                      <li key={`${item.type}-${item.id}`} className="ticket-item-row">
                        <div className="ticket-item-info">
                          <strong>{item.name}</strong>
                          <span>{formatCurrency(item.salePrice)} c/u</span>
                        </div>

                        <div className="ticket-qty-controls">
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            onClick={() => handleUpdateQty(item.id, item.type, -1)}
                            aria-label={`Disminuir ${item.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span className="qty-number">{item.quantity}</span>
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            onClick={() => handleUpdateQty(item.id, item.type, 1)}
                            aria-label={`Aumentar ${item.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <div className="ticket-item-subtotal">
                          <strong>{formatCurrency(item.quantity * item.salePrice)}</strong>
                        </div>

                        <button
                          type="button"
                          className="mini-btn remove-ticket-btn"
                          onClick={() => handleRemoveItem(item.id, item.type)}
                          aria-label={`Eliminar ${item.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {ticketItems.length > 0 && (
                <>
                  <div className="ticket-breakdown">
                    <div className="breakdown-row">
                      <span>Costo estimado ingredientes:</span>
                      <strong>{formatCurrency(ticketTotals.totalCost)}</strong>
                    </div>
                    <div className="breakdown-row">
                      <span>Margen de ganancia:</span>
                      <strong className="trend-positive">
                        {ticketTotals.margin.toFixed(1)}% (+{formatCurrency(ticketTotals.profit)})
                      </strong>
                    </div>
                    <div className="breakdown-total-row">
                      <span>Total a Cobrar</span>
                      <strong className="total-amount-display">
                        {formatCurrency(ticketTotals.totalAmount)}
                      </strong>
                    </div>
                  </div>

                  <label className="form-field" style={{ marginTop: 12 }}>
                    <span>Notas de comanda / cocina (opcional)</span>
                    <input
                      type="text"
                      className="search-input"
                      value={ticketNotes}
                      placeholder="Ej. Sin cebolla, término medio..."
                      onChange={(e) => setTicketNotes(e.target.value)}
                    />
                  </label>

                  <div className="ticket-actions-row" style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ flex: 1, padding: "14px 18px", fontSize: "0.95rem" }}
                      onClick={handleSaveTicket}
                    >
                      {activeTicketId ? "Actualizar Pedido" : "Guardar Pedido"}
                    </button>
                    <button
                      type="submit"
                      className="primary-btn checkout-btn"
                      style={{ flex: 1, padding: "14px 18px", fontSize: "1.05rem" }}
                    >
                      Cobrar & Cerrar
                    </button>
                  </div>
                </>
              )}
            </form>
          </section>
        </div>
      ) : (
        /* History Tab */
        <section className="panel">
          <div className="panel-header">
            <h3>Historial de Ventas & Comandas</h3>
            <span className="pill neutral">{completedSales.length} registradas</span>
          </div>

          <div className="table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Fecha / Hora</th>
                  <th>Mesa / Cliente</th>
                  <th>Detalle de Ítems</th>
                  <th>Método Pago</th>
                  <th>Total</th>
                  <th>Margen</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "28px" }}>
                      No hay ventas registradas aún.
                    </td>
                  </tr>
                ) : (
                  completedSales.map((sale) => {
                    const isVoided = sale.status === "voided";
                    const margin =
                      sale.totalAmount > 0
                        ? (((sale.totalAmount - sale.totalCost) / sale.totalAmount) * 100).toFixed(1)
                        : "0.0";

                    return (
                      <tr key={sale.id} className={isVoided ? "row-voided" : ""}>
                        <td>
                          <strong>{sale.id}</strong>
                        </td>
                        <td>
                          {formatDisplayDate(sale.date)}
                          <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)" }}>
                            {sale.time}
                          </span>
                        </td>
                        <td>{sale.tableOrCustomer || "Mostrador"}</td>
                        <td>
                          <div style={{ fontSize: "0.85rem", lineHeight: 1.4 }}>
                            {(sale.items || []).map((it, idx) => (
                              <span key={idx} style={{ display: "block" }}>
                                {it.quantity}x {it.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{sale.paymentMethod}</td>
                        <td>
                          <strong>{formatCurrency(sale.totalAmount)}</strong>
                        </td>
                        <td>
                          <span className="compliance-high">{margin}%</span>
                        </td>
                        <td>
                          <span className={`status ${isVoided ? "danger" : "success"}`}>
                            {isVoided ? "Anulada" : "Completada"}
                          </span>
                        </td>
                        <td>
                          {!isVoided ? (
                            <button
                              type="button"
                              className="danger-btn mini-btn"
                              onClick={() => handleVoidSale(sale.id)}
                              aria-label={`Anular venta ${sale.id}`}
                            >
                              Anular
                            </button>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                              Reintegrado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
