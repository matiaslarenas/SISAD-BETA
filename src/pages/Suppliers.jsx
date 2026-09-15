import { useState } from "react";

import {
  Truck,
  Star,
  CheckCircle,
  TrendingUp,
} from "lucide-react";

import Modal from "../components/Modal";
import SearchBar from "../components/SearchBar";
import MetricCard from "../components/MetricCard";
import SuppliersTable from "../components/SuppliersTable";
import { useAppData } from "../context/AppDataContext";
import {
  parsePercent,
} from "../utils/format";
import {
  hasValidationErrors,
  validateSupplierForm,
} from "../utils/validation";

const emptySupplier = {
  name: "",
  category: "",
  leadTime: "",
  phone: "",
  compliance: "",
};

function Suppliers() {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    removeSupplier,
  } = useAppData();

  const [search, setSearch] =
    useState("");
  const [showSupplierModal, setShowSupplierModal] =
    useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState(null);
  const [newSupplier, setNewSupplier] =
    useState(emptySupplier);
  const [errors, setErrors] = useState({});

  const filteredSuppliers =
    suppliers.filter((supplier) =>
      supplier.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  const avgCompliance =
    suppliers.length === 0
      ? 0
      : Math.round(
          suppliers.reduce(
            (sum, supplier) =>
              sum +
              parsePercent(
                supplier.compliance
              ),
            0
          ) / suppliers.length
        );

  const highComplianceCount =
    suppliers.filter(
      (supplier) =>
        parsePercent(
          supplier.compliance
        ) >= 90
    ).length;

  const supplierMetrics = [
    {
      title: "Proveedores",
      value: suppliers.length,
      trend: "Registrados",
      icon: Truck,
    },
    {
      title: "Calificación",
      value: `${avgCompliance}%`,
      trend: "Promedio",
      icon: Star,
    },
    {
      title: "Entregas",
      value: highComplianceCount,
      trend: "Cumplen ≥90%",
      icon: CheckCircle,
    },
    {
      title: "Cumplimiento",
      value: `${avgCompliance}%`,
      trend: "Global",
      icon: TrendingUp,
    },
  ];

  const closeModal = () => {
    setShowSupplierModal(false);
    setNewSupplier(emptySupplier);
    setErrors({});
    setEditingSupplier(null);
  };

  const handleAddSupplier = (
    event
  ) => {
    event.preventDefault();

    const nextErrors =
      validateSupplierForm(newSupplier);

    setErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      return;
    }

    if (editingSupplier) {
      updateSupplier(
        editingSupplier.id,
        newSupplier
      );
    } else {
      addSupplier(newSupplier);
    }
    closeModal();
  };

  const handleEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({
      name: supplier.name,
      category: supplier.category,
      leadTime: supplier.leadTime,
      phone: supplier.phone,
      compliance: parsePercent(
        supplier.compliance
      ),
    });
    setErrors({});
    setShowSupplierModal(true);
  };

  const handleDeleteSupplier = (supplierId) => {
    const supplier = suppliers.find(
      (item) => item.id === supplierId
    );

    if (
      supplier &&
      window.confirm(
        `¿Eliminar a ${supplier.name}?`
      )
    ) {
      removeSupplier(supplierId);
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Abastecimiento
          </p>

          <h2>
            Proveedores
          </h2>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() =>
            setShowSupplierModal(true)
          }
          aria-label="Crear nuevo proveedor"
        >
          Nuevo Proveedor
        </button>
      </header>

      <section className="metrics-grid">
        {supplierMetrics.map(
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
            Directorio
          </h3>

          <span className="pill neutral">
            {
              filteredSuppliers.length
            }{" "}
            proveedores
          </span>
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar proveedor..."
          label="Buscar proveedor"
          id="supplier-search"
        />

        <SuppliersTable
          suppliers={filteredSuppliers}
          onEdit={handleEditSupplier}
          onDelete={handleDeleteSupplier}
        />
      </section>

      <Modal
        isOpen={showSupplierModal}
        onClose={closeModal}
        title={
          editingSupplier
            ? "Editar Proveedor"
            : "Nuevo Proveedor"
        }
        description="Registra condiciones operativas y cumplimiento para priorizar abastecimiento."
      >
        <form
          className="modal-form"
          onSubmit={handleAddSupplier}
          noValidate
        >
          {hasValidationErrors(errors) ? (
            <div className="form-alert" role="alert">
              Revisa los campos requeridos antes de guardar.
            </div>
          ) : null}

          <div className="form-grid">
            <label className="form-field">
              <span>Nombre</span>
              <input
                type="text"
                className="search-input"
                value={newSupplier.name}
                aria-invalid={Boolean(
                  errors.name
                )}
                onChange={(event) =>
                  setNewSupplier({
                    ...newSupplier,
                    name: event.target.value,
                  })
                }
              />
              {errors.name ? (
                <p className="field-error" role="alert">
                  {errors.name}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Categoría</span>
              <input
                type="text"
                className="search-input"
                value={newSupplier.category}
                aria-invalid={Boolean(
                  errors.category
                )}
                onChange={(event) =>
                  setNewSupplier({
                    ...newSupplier,
                    category:
                      event.target.value,
                  })
                }
              />
              {errors.category ? (
                <p className="field-error" role="alert">
                  {errors.category}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Lead Time</span>
              <input
                type="text"
                className="search-input"
                value={newSupplier.leadTime}
                aria-invalid={Boolean(
                  errors.leadTime
                )}
                onChange={(event) =>
                  setNewSupplier({
                    ...newSupplier,
                    leadTime:
                      event.target.value,
                  })
                }
              />
              {errors.leadTime ? (
                <p className="field-error" role="alert">
                  {errors.leadTime}
                </p>
              ) : null}
            </label>

            <label className="form-field">
              <span>Teléfono (opcional)</span>
              <input
                type="text"
                className="search-input"
                value={newSupplier.phone}
                onChange={(event) =>
                  setNewSupplier({
                    ...newSupplier,
                    phone: event.target.value,
                  })
                }
              />
            </label>

            <label className="form-field">
              <span>Cumplimiento (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                className="search-input"
                value={newSupplier.compliance}
                aria-invalid={Boolean(
                  errors.compliance
                )}
                onChange={(event) =>
                  setNewSupplier({
                    ...newSupplier,
                    compliance:
                      event.target.value,
                  })
                }
              />
              {errors.compliance ? (
                <p className="field-error" role="alert">
                  {errors.compliance}
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
              {editingSupplier
                ? "Actualizar Proveedor"
                : "Guardar Proveedor"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Suppliers;
