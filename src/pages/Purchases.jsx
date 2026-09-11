import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { toast } from "sonner";
import { Zap, Plus, Check } from "lucide-react";

function Purchases() {
  const { inventory, suppliers } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftItems, setDraftItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  // Obtener únicamente productos con stock crítico para el Planificador Inteligente
  const criticalProducts = inventory.filter(
    (item) => item.onHand <= item.minStock
  );
  const requestedProductId = searchParams.get("product");

  useEffect(() => {
    if (!requestedProductId) return;

    const product = inventory.find((item) => item.id === requestedProductId);
    if (!product) {
      toast.error("El producto solicitado ya no existe en el inventario.");
      setSearchParams({}, { replace: true });
      return;
    }

    setDraftItems((currentItems) => {
      if (currentItems.some((item) => item.productId === product.id)) {
        return currentItems;
      }

      const quantity = Math.max(product.minStock - product.onHand, 1);
      toast.success(`${product.item} agregado al borrador de compra.`);
      return [
        ...currentItems,
        {
          productId: product.id,
          productName: product.item,
          category: product.category,
          unit: product.purchaseUnit,
          costPerUnit: product.costPerUnit,
          quantity,
          totalCost: quantity * product.costPerUnit,
        },
      ];
    });
    setSearchParams({}, { replace: true });
  }, [inventory, requestedProductId, setSearchParams]);

  // Agregar insumo individual del Planificador al Borrador
  const handleAddToDraft = (item) => {
    const exists = draftItems.find((d) => d.productId === item.id);
    if (exists) {
      toast.info(`${item.item} ya está en el borrador.`);
      return;
    }

    const neededQty = Math.max(item.minStock - item.onHand, 1);

    const newItem = {
      productId: item.id,
      productName: item.item,
      category: item.category,
      unit: item.purchaseUnit,
      costPerUnit: item.costPerUnit,
      quantity: neededQty,
      totalCost: neededQty * item.costPerUnit,
    };

    setDraftItems((prev) => [...prev, newItem]);
    toast.success(`${item.item} agregado al borrador.`);
  };

  // Agregar TODOS los productos críticos de un solo clic
  const handleAddAllCriticalToDraft = () => {
    if (criticalProducts.length === 0) {
      toast.info("No hay productos en quiebre de stock.");
      return;
    }

    const newItems = criticalProducts.map((item) => {
      const neededQty = Math.max(item.minStock - item.onHand, 1);
      return {
        productId: item.id,
        productName: item.item,
        category: item.category,
        unit: item.purchaseUnit,
        costPerUnit: item.costPerUnit,
        quantity: neededQty,
        totalCost: neededQty * item.costPerUnit,
      };
    });

    setDraftItems(newItems);
    toast.success(`Se agregaron ${newItems.length} insumos al borrador.`);
  };

  // Actualizar cantidad en el borrador
  const handleUpdateQuantity = (productId, newQuantity) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
            ...item,
            quantity: Math.max(newQuantity, 1),
            totalCost: Math.max(newQuantity, 1) * item.costPerUnit,
          }
          : item
      )
    );
  };

  // Eliminar producto del borrador
  const handleRemoveFromDraft = (productId) => {
    setDraftItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Finalizar Orden de Compra y enviar por WhatsApp
  const handleFinalizePurchaseOrder = () => {
    if (draftItems.length === 0) {
      toast.error("El borrador está vacío.");
      return;
    }

    if (!selectedSupplier) {
      toast.error("Selecciona un proveedor antes de enviar.");
      return;
    }

    const totalAmount = draftItems.reduce((sum, item) => sum + item.totalCost, 0);

    const itemsText = draftItems
      .map((i) => `• *${i.productName}*: ${i.quantity} ${i.unit}`)
      .join("\n");

    const message =
      `Hola! 👋 Saludos de *El Mesón de los Laureles*.\n\n` +
      `Adjuntamos la *Orden de Compra Final* para *${selectedSupplier}*:\n\n` +
      `${itemsText}\n\n` +
      `*Monto Estimado:* $${totalAmount.toLocaleString("es-CL")}\n` +
      `Por favor confirmarnos disponibilidad. ¡Muchas gracias!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    setDraftItems([]);
    toast.success("Orden enviada a WhatsApp con éxito.");
  };

  return (
    <div className="purchases-page">
      {/* ⚡ SECCIÓN 1: PLANIFICADOR INTELIGENTE DE COMPRAS */}
      <section className="panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={20} color="var(--primary)" />
            <h3>Planificador Inteligente de Compras</h3>
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={handleAddAllCriticalToDraft}
            style={{ fontSize: "0.85rem" }}
          >
            + Agregar Todos los Críticos ({criticalProducts.length})
          </button>
        </div>

        <p style={{ fontSize: "0.88rem", color: "gray", marginTop: "6px" }}>
          Insumos que han alcanzado o superado su stock mínimo. Presiona <strong>+ Agregar</strong> para moverlos al borrador.
        </p>

        {criticalProducts.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "12px",
              marginTop: "16px",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {criticalProducts.map((item) => {
              const inDraft = draftItems.some((d) => d.productId === item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "0.95rem" }}>
                      {item.item}
                    </strong>
                    <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                      Stock: {item.onHand} {item.purchaseUnit} (Mín: {item.minStock})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToDraft(item)}
                    disabled={inDraft}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: inDraft ? "#e5e7eb" : "#059669",
                      color: inDraft ? "#6b7280" : "#fff",
                      cursor: inDraft ? "default" : "pointer",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {inDraft ? <Check size={14} /> : <Plus size={14} />}
                    {inDraft ? "Agregado" : "Agregar"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ marginTop: "12px", color: "green" }}>
            ✓ No hay productos en quiebre de stock en este momento.
          </p>
        )}
      </section>

      {/* 🛒 SECCIÓN 2: BORRADOR DE ORDEN DE COMPRA */}
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>🛒 Borrador de Orden de Compra ({draftItems.length} insumos)</h3>

          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          >
            <option value="">-- Seleccionar Proveedor --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {draftItems.length > 0 ? (
          <>
            <table className="table" style={{ marginTop: "16px", width: "100%" }}>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Cantidad Pedida</th>
                  <th>Costo Unit.</th>
                  <th>Total Estimado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      <strong>{item.productName}</strong>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        min="1"
                        onChange={(e) =>
                          handleUpdateQuantity(item.productId, Number(e.target.value))
                        }
                        style={{ width: "70px", padding: "4px" }}
                      />{" "}
                      {item.unit}
                    </td>
                    <td>${item.costPerUnit.toLocaleString("es-CL")}</td>
                    <td>
                      <strong>${item.totalCost.toLocaleString("es-CL")}</strong>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromDraft(item.productId)}
                        style={{
                          color: "var(--danger)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        ✕ Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4>
                Total Orden: $
                {draftItems
                  .reduce((sum, i) => sum + i.totalCost, 0)
                  .toLocaleString("es-CL")}
              </h4>

              <button
                type="button"
                className="primary-btn"
                onClick={handleFinalizePurchaseOrder}
                style={{
                  backgroundColor: "#059669",
                  padding: "10px 20px",
                  fontWeight: "bold",
                }}
              >
                📲 Generar Orden de Compra Final (Enviar por WA)
              </button>
            </div>
          </>
        ) : (
          <p style={{ marginTop: "12px", color: "gray" }}>
            El borrador está vacío. Agrega productos desde el Planificador Inteligente superior para consolidar el pedido.
          </p>
        )}
      </section>
    </div>
  );
}

export default Purchases;