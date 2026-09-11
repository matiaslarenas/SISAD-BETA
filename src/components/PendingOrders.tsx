import type { PurchaseOrder } from "../types/inventory";
import { formatCurrency } from "../utils/format";

interface PendingOrdersProps {
  purchases?: PurchaseOrder[];
  onViewAll: () => void;
}

function PendingOrders({ purchases = [], onViewAll }: PendingOrdersProps) {
  const pendingPurchases = purchases.filter(
    (purchase) => purchase.status !== "received"
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Pedidos Pendientes</h3>
        <button type="button" className="mini-btn" onClick={onViewAll}>
          Ver compras
        </button>
      </div>

      {pendingPurchases.length > 0 ? (
        <div className="purchase-list">
          {pendingPurchases.slice(0, 5).map((purchase) => (
            <article className="purchase-row" key={purchase.id}>
              <div>
                <strong>{purchase.id}</strong>
                <span>{purchase.supplier}</span>
              </div>
              <div>
                <strong>{formatCurrency(purchase.amount)}</strong>
                <span>{purchase.items.length} ítems</span>
              </div>
              <span className={`status ${purchase.statusMeta.className}`}>
                {purchase.statusMeta.label}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="alert-item success">
          <strong>Sin pedidos pendientes</strong>
          <span>Todas las órdenes de compra han sido recibidas.</span>
        </div>
      )}
    </section>
  );
}

export default PendingOrders;
