import { useRef, useState } from "react";
import { toast } from "sonner";

import Modal from "./Modal";
import { useAppData } from "../context/AppDataContext";
import { getTodayISODate } from "../state/appState";
import { formatCurrency } from "../utils/format";
import {
  hasValidationErrors,
  validateDirectPurchaseForm,
} from "../utils/validation";

// Formulario de compra directa: lo comprado ya llegó, así que al guardar
// el stock sube al precio pagado (ver recordDirectPurchase en appState).
function DirectPurchaseModal({ isOpen, onClose }) {
  const { inventory, suppliers, recordDirectPurchase } = useAppData();
  const nextLineKey = useRef(1);

  const createLine = () => ({
    key: nextLineKey.current++,
    productId: "",
    quantity: "",
    unitCost: "",
  });

  const createEmptyForm = () => ({
    supplier: "",
    purchaseDate: getTodayISODate(),
    notes: "",
    items: [createLine()],
  });

  const [form, setForm] = useState(createEmptyForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setForm(createEmptyForm());
    setErrors({});
    onClose();
  };

  const updateLine = (key, changes) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((line) =>
        line.key === key ? { ...line, ...changes } : line
      ),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createLine()] }));
  };

  const removeLine = (key) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((line) => line.key !== key),
    }));
  };

  const lineTotal = (line) =>
    (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);

  const total = form.items.reduce((sum, line) => sum + lineTotal(line), 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateDirectPurchaseForm(form);
    setErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      toast.error("Revisa los campos marcados antes de registrar la compra.");
      return;
    }

    // dispatch ya muestra el error del servidor con un toast y lo relanza:
    // si falla, se conserva el formulario para corregir y reintentar.
    setIsSubmitting(true);
    try {
      await recordDirectPurchase({
        supplier: form.supplier,
        purchaseDate: form.purchaseDate,
        notes: form.notes,
        items: form.items.map(({ productId, quantity, unitCost }) => ({
          productId,
          quantity,
          unitCost,
        })),
      });
    } catch {
      return;
    } finally {
      setIsSubmitting(false);
    }

    toast.success("Compra registrada", {
      description: `${form.supplier} • ${formatCurrency(total)} (stock actualizado)`,
    });
    setForm(createEmptyForm());
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar compra recibida"
      description="Ingresa lo que llegó y el precio pagado. Al guardar, el stock sube y ese precio pasa a ser el costo del producto."
    >
      <form className="modal-form" onSubmit={handleSubmit} noValidate>
        {hasValidationErrors(errors) ? (
          <div className="form-alert" role="alert">
            Revisa los campos marcados antes de registrar la compra.
          </div>
        ) : null}

        <div className="form-grid">
          <label className="form-field">
            <span>Proveedor</span>
            <input
              type="text"
              className="search-input"
              list="direct-purchase-suppliers"
              value={form.supplier}
              placeholder="Ej: Feria, supermercado o proveedor"
              aria-invalid={Boolean(errors.supplier)}
              onChange={(event) =>
                setForm({ ...form, supplier: event.target.value })
              }
            />
            <datalist id="direct-purchase-suppliers">
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.name} />
              ))}
            </datalist>
            {errors.supplier ? (
              <p className="field-error" role="alert">
                {errors.supplier}
              </p>
            ) : null}
          </label>

          <label className="form-field">
            <span>Fecha de la compra</span>
            <input
              type="date"
              className="search-input"
              value={form.purchaseDate}
              aria-invalid={Boolean(errors.purchaseDate)}
              onChange={(event) =>
                setForm({ ...form, purchaseDate: event.target.value })
              }
            />
            {errors.purchaseDate ? (
              <p className="field-error" role="alert">
                {errors.purchaseDate}
              </p>
            ) : null}
          </label>
        </div>

        <div className="direct-purchase-lines">
          {form.items.map((line, index) => {
            const product = inventory.find((item) => item.id === line.productId);
            const lineErrors = errors.lines?.[index] || {};

            return (
              <div key={line.key} className="direct-purchase-line">
                <label className="form-field">
                  <span>Producto</span>
                  <select
                    className="search-input"
                    value={line.productId}
                    aria-invalid={Boolean(lineErrors.productId)}
                    onChange={(event) =>
                      updateLine(line.key, { productId: event.target.value })
                    }
                  >
                    <option value="">Seleccionar producto</option>
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item} ({item.purchaseUnit})
                      </option>
                    ))}
                  </select>
                  {lineErrors.productId ? (
                    <p className="field-error" role="alert">
                      {lineErrors.productId}
                    </p>
                  ) : null}
                </label>

                <label className="form-field">
                  <span>Cantidad{product ? ` (${product.purchaseUnit})` : ""}</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    className="search-input"
                    value={line.quantity}
                    placeholder="Ej: 2"
                    aria-invalid={Boolean(lineErrors.quantity)}
                    onChange={(event) =>
                      updateLine(line.key, { quantity: event.target.value })
                    }
                  />
                  {lineErrors.quantity ? (
                    <p className="field-error" role="alert">
                      {lineErrors.quantity}
                    </p>
                  ) : null}
                </label>

                <label className="form-field">
                  <span>Precio por {product?.purchaseUnit || "unidad"}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    className="search-input"
                    value={line.unitCost}
                    placeholder={
                      product?.costPerUnit
                        ? `Último: ${formatCurrency(product.costPerUnit)}`
                        : "Ej: 1500"
                    }
                    aria-invalid={Boolean(lineErrors.unitCost)}
                    onChange={(event) =>
                      updateLine(line.key, { unitCost: event.target.value })
                    }
                  />
                  {lineErrors.unitCost ? (
                    <p className="field-error" role="alert">
                      {lineErrors.unitCost}
                    </p>
                  ) : null}
                </label>

                <div className="direct-purchase-line-footer">
                  <strong>{formatCurrency(lineTotal(line))}</strong>
                  {form.items.length > 1 ? (
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => removeLine(line.key)}
                      aria-label={`Quitar producto ${index + 1}`}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          <button type="button" className="secondary-btn" onClick={addLine}>
            + Agregar producto
          </button>
        </div>

        <label className="form-field full-width">
          <span>Notas (opcional)</span>
          <input
            type="text"
            className="search-input"
            value={form.notes}
            placeholder="Ej: Boleta 1234"
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </label>

        <div className="modal-actions">
          <strong className="direct-purchase-total">
            Total: {formatCurrency(total)}
          </strong>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar compra"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default DirectPurchaseModal;
