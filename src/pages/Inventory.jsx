import { useMemo, useState } from "react";

import {
  Package,
  AlertTriangle,
  Warehouse,
  TrendingUp,
  Trash2,
} from "lucide-react";

import Modal from "../components/Modal";
import SearchBar from "../components/SearchBar";
import FilterSelect from "../components/FilterSelect";
import MetricCard from "../components/MetricCard";
import InventoryTable from "../components/InventoryTable";
import { useAppData } from "../context/AppDataContext";
import {
  inventoryCategories,
} from "../data/categories";
import { formatCurrency } from "../utils/format";
import {
  formatDisplayDate,
  getTodayISODate,
  WASTE_REASONS,
} from "../state/appState";
import {
  validateProductForm,
  validateWasteForm,
  hasValidationErrors,
} from "../utils/validation";
import { toast } from "sonner";

const movementLabels = {
  purchase: "Recepción",
  waste: "Merma",
  adjustment: "Ajuste",
  sale: "Salida",
};

const emptyProduct = {
  item: "",
  type: "ingredient",
  category: "",
  supplier: "",
  location: "",
  purchaseUnit: "kg",
  costPerUnit: "",
  onHand: "",
  minStock: "",
};

function Inventory() {
  const {
    inventory,
    recentMovements,
    purchases,
    saveProduct,
    removeProduct,
    recordWaste,
  } = useAppData();

  const [search, setSearch] =
    useState("");
  const [category, setCategory] =
    useState("Todas");
  const [showProductModal, setShowProductModal] =
    useState(false);
  const [newProduct, setNewProduct] =
    useState(emptyProduct);
  const [editingProduct, setEditingProduct] =
    useState(null);
  const [errors, setErrors] = useState({});

  // Waste modal state
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteForm, setWasteForm] = useState({
    productId: "",
    quantity: "",
    reason: WASTE_REASONS[0],
    notes: "",
    movementDate: getTodayISODate(),
  });
  const [wasteErrors, setWasteErrors] = useState({});

  const categories = useMemo(
    () => [
      "Todas",
      ...inventoryCategories,
    ],
    []
  );

  const filteredInventory =
    inventory.filter((item) => {
      const matchesSearch =
        item.item
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesCategory =
        category === "Todas"
          ? true
          : item.category === category;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  const totalProducts = inventory.length;
  const criticalCount =
    inventory.filter(
      (item) =>
        item.onHand <= item.minStock
    ).length;
  const totalValue = inventory.reduce(
    (sum, item) =>
      sum + item.inventoryValue,
    0
  );
  const healthyPercent =
    totalProducts === 0
      ? 0
      : Math.round(
          ((totalProducts - criticalCount) /
            totalProducts) *
            100
        );

  const pendingReceipts =
    purchases.filter(
      (purchase) =>
        purchase.status !== "received"
    ).length;

  const inventoryMetrics = [
    {
      title: "Productos Activos",
      value: totalProducts,
      trend: "Activos",
      icon: Package,
    },
    {
      title: "Stock Crítico",
      value: criticalCount,
      trend:
        criticalCount > 0
          ? "Reponer"
          : "OK",
      icon: AlertTriangle,
    },
    {
      title: "Inventario Total",
      value: formatCurrency(totalValue),
      trend: "CLP",
      icon: Warehouse,
    },
    {
      title: "Rotación",
      value: `${healthyPercent}%`,
      trend: "Saludable",
      icon: TrendingUp,
    },
  ];

  const closeModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setNewProduct(emptyProduct);
    setErrors({});
  };

  const handleAddProduct = (event) => {
    event.preventDefault();

    const nextErrors =
      validateProductForm(newProduct);

    setErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      toast.error("Revisa los errores en el formulario.");
      return;
    }

    saveProduct(
      editingProduct?.id,
      newProduct
    );
    toast.success(
      editingProduct ? "Producto actualizado" : "Producto creado",
      { description: newProduct.item }
    );
    closeModal();
  };

  const handleEditProduct = (
    product
  ) => {
    setEditingProduct(product);
    setErrors({});
    setNewProduct({
      item: product.item,
      type: product.type,
      category: product.category,
      supplier: product.supplier,
      location: product.location,
      purchaseUnit:
        product.purchaseUnit,
      costPerUnit: String(
        product.costPerUnit
      ),
      onHand: String(product.onHand),
      minStock: String(product.minStock),
    });
    setShowProductModal(true);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setNewProduct(emptyProduct);
    setErrors({});
    setShowProductModal(true);
  };

  const openWasteModal = (productId = "") => {
    const defaultProduct = productId
      ? inventory.find((p) => p.id === productId)
      : inventory[0];

    setWasteForm({
      productId: defaultProduct?.id || "",
      quantity: "",
      reason: WASTE_REASONS[0],
      notes: "",
      movementDate: getTodayISODate(),
    });
    setWasteErrors({});
    setShowWasteModal(true);
  };

  const closeWasteModal = () => {
    setShowWasteModal(false);
    setWasteErrors({});
  };

  const handleRecordWaste = (event) => {
    event.preventDefault();

    const selectedProduct = inventory.find(
      (p) => p.id === wasteForm.productId
    );
    const availableStock = selectedProduct ? selectedProduct.onHand : 0;

    const nextErrors = validateWasteForm(wasteForm, availableStock);
    setWasteErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      toast.error("Revisa los errores al registrar la merma.");
      return;
    }

    recordWaste(wasteForm);
    toast.warning("Merma registrada", {
      description: `${wasteForm.quantity} ${selectedProduct?.purchaseUnit || "un"} de ${selectedProduct?.item} (${wasteForm.reason})`,
    });
    closeWasteModal();
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Inventario
          </p>

          <h2>
            Gestión de Inventario
          </h2>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => openWasteModal()}
            aria-label="Registrar merma o desperdicio de insumo"
          >
            Registrar Merma
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={openNewProductModal}
            aria-label="Crear nuevo producto"
          >
            Nuevo Producto
          </button>
        </div>
      </header>

      <section className="metrics-grid">
        {inventoryMetrics.map(
          (metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              trend={metric.trend}
              icon={metric.icon}
            />
          )
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>
            Inventario Actual
          </h3>

          <span className="pill neutral">
            {
              filteredInventory.length
            }{" "}
            productos
          </span>
        </div>

        <div className="filters-row">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar producto..."
            label="Buscar producto"
            id="inventory-search"
          />

          <FilterSelect
            value={category}
            onChange={setCategory}
            options={categories}
            id="inventory-category-filter"
            ariaLabel="Filtrar inventario por categoría"
          />
        </div>

        <InventoryTable
          inventory={filteredInventory}
          onDelete={removeProduct}
          onEdit={handleEditProduct}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>
            Alertas de Inventario
          </h3>
        </div>

        <div className="alert-item danger">
          <strong>
            Stock Crítico
          </strong>

          <span>
            {criticalCount > 0
              ? `${criticalCount} productos requieren reposición inmediata.`
              : "No hay productos en nivel crítico."}
          </span>
        </div>

        <div className="alert-item warning">
          <strong>
            Recepciones Pendientes
          </strong>

          <span>
            {pendingReceipts} órdenes esperan recepción o tránsito.
          </span>
        </div>

        <div className="alert-item success">
          <strong>
            Inventario desde movimientos
          </strong>

          <span>
            El stock visible se calcula desde compras, mermas y ajustes.
          </span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>
            Últimos Movimientos
          </h3>
        </div>

        <div className="alert-list">
          {recentMovements.map(
            (movement) => (
              <div
                key={movement.id}
                className="alert-item neutral-surface"
              >
                <strong>
                  {
                    movementLabels[
                      movement.type
                    ]
                  }{" "}
                  · {movement.productName}
                </strong>

                <span>
                  {movement.quantity > 0
                    ? "+"
                    : ""}
                  {movement.quantity}{" "}
                  · {formatDisplayDate(
                    movement.movementDate
                  )}
                  {" · "}
                  {movement.reference}
                </span>
              </div>
            )
          )}
        </div>
      </section>

      <Modal
        isOpen={showProductModal}
        onClose={closeModal}
        title={
          editingProduct
            ? "Editar Producto"
            : "Nuevo Producto"
        }
        description="Al guardar, el stock se registra como saldo inicial o ajuste de inventario."
      >
        <form
          className="modal-form"
          onSubmit={handleAddProduct}
          noValidate
        >
          {hasValidationErrors(errors) ? (
            <div
              className="form-alert"
              role="alert"
            >
              Revisa los campos marcados antes de guardar.
            </div>
          ) : null}

          <div className="form-grid">
            <label className="form-field">
              <span>Nombre del producto</span>
              <input
                type="text"
                className="search-input"
                value={newProduct.item}
                aria-invalid={Boolean(
                  errors.item
                )}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    item: event.target.value,
                  })
                }
              />
              {errors.item ? (
                <p className="field-error" role="alert">
                  {errors.item}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Categoría</span>
              <select
                className="search-input"
                value={newProduct.category}
                aria-invalid={Boolean(
                  errors.category
                )}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    category:
                      event.target.value,
                  })
                }
              >
                <option value="">
                  Seleccionar categoría
                </option>
                {inventoryCategories.map(
                  (entry) => (
                    <option
                      key={entry}
                      value={entry}
                    >
                      {entry}
                    </option>
                  )
                )}
              </select>
              {errors.category ? (
                <p className="field-error" role="alert">
                  {errors.category}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Tipo</span>
              <select
                className="search-input"
                value={newProduct.type}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    type: event.target.value,
                  })
                }
              >
                <option value="ingredient">
                  Ingrediente
                </option>
                <option value="resale">
                  Producto de venta
                </option>
                <option value="supply">
                  Insumo
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>Unidad de compra</span>
              <select
                className="search-input"
                value={newProduct.purchaseUnit}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    purchaseUnit:
                      event.target.value,
                  })
                }
              >
                <option value="kg">Kilogramo (kg)</option>
                <option value="gr">Gramo (gr)</option>
                <option value="lt">Litro (lt)</option>
                <option value="ml">Mililitro (ml)</option>
                <option value="un">Unidad (un)</option>
              </select>
            </label>

            <label className="form-field">
              <span>Proveedor habitual</span>
              <input
                type="text"
                className="search-input"
                value={newProduct.supplier}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    supplier:
                      event.target.value,
                  })
                }
              />
            </label>

            <label className="form-field">
              <span>Ubicación</span>
              <input
                type="text"
                className="search-input"
                value={newProduct.location}
                aria-invalid={Boolean(
                  errors.location
                )}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    location:
                      event.target.value,
                  })
                }
              />
              {errors.location ? (
                <p className="field-error" role="alert">
                  {errors.location}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Costo unitario</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="search-input"
                value={newProduct.costPerUnit}
                aria-invalid={Boolean(
                  errors.costPerUnit
                )}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    costPerUnit:
                      event.target.value,
                  })
                }
              />
              {errors.costPerUnit ? (
                <p className="field-error" role="alert">
                  {errors.costPerUnit}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Stock actual</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="search-input"
                value={newProduct.onHand}
                aria-invalid={Boolean(
                  errors.onHand
                )}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    onHand:
                      event.target.value,
                  })
                }
              />
              {errors.onHand ? (
                <p className="field-error" role="alert">
                  {errors.onHand}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Stock mínimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="search-input"
                value={newProduct.minStock}
                aria-invalid={Boolean(
                  errors.minStock
                )}
                onChange={(event) =>
                  setNewProduct({
                    ...newProduct,
                    minStock:
                      event.target.value,
                  })
                }
              />
              {errors.minStock ? (
                <p className="field-error" role="alert">
                  {errors.minStock}
                </p>
              ) : null}
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={closeModal}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-btn"
            >
              Guardar Producto
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showWasteModal}
        onClose={closeWasteModal}
        title="Registrar Merma de Insumo"
        description="Registra mermas o pérdidas para mantener el stock físico exacto y costear la pérdida."
      >
        <form
          className="modal-form"
          onSubmit={handleRecordWaste}
          noValidate
        >
          {hasValidationErrors(wasteErrors) ? (
            <div
              className="form-alert"
              role="alert"
            >
              Revisa los campos marcados antes de registrar la merma.
            </div>
          ) : null}

          <div className="form-grid">
            <label className="form-field">
              <span>Producto</span>
              <select
                className="search-input"
                value={wasteForm.productId}
                aria-invalid={Boolean(wasteErrors.productId)}
                onChange={(event) =>
                  setWasteForm({
                    ...wasteForm,
                    productId: event.target.value,
                  })
                }
              >
                <option value="">Seleccionar producto</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.item} (Stock: {item.onHand} {item.purchaseUnit})
                  </option>
                ))}
              </select>
              {wasteErrors.productId ? (
                <p className="field-error" role="alert">
                  {wasteErrors.productId}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Cantidad a descartar</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="search-input"
                value={wasteForm.quantity}
                aria-invalid={Boolean(wasteErrors.quantity)}
                placeholder="Ej: 0.5"
                onChange={(event) =>
                  setWasteForm({
                    ...wasteForm,
                    quantity: event.target.value,
                  })
                }
              />
              {wasteErrors.quantity ? (
                <p className="field-error" role="alert">
                  {wasteErrors.quantity}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Motivo de merma</span>
              <select
                className="search-input"
                value={wasteForm.reason}
                aria-invalid={Boolean(wasteErrors.reason)}
                onChange={(event) =>
                  setWasteForm({
                    ...wasteForm,
                    reason: event.target.value,
                  })
                }
              >
                {WASTE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {wasteErrors.reason ? (
                <p className="field-error" role="alert">
                  {wasteErrors.reason}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Fecha de merma</span>
              <input
                type="date"
                className="search-input"
                value={wasteForm.movementDate}
                onChange={(event) =>
                  setWasteForm({
                    ...wasteForm,
                    movementDate: event.target.value,
                  })
                }
              />
            </label>

            <label className="form-field full-width">
              <span>Notas u observaciones</span>
              <input
                type="text"
                className="search-input"
                value={wasteForm.notes}
                placeholder="Ej: Masa quemada durante servicio del almuerzo"
                onChange={(event) =>
                  setWasteForm({
                    ...wasteForm,
                    notes: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={closeWasteModal}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-btn"
            >
              Registrar Merma
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Inventory;
