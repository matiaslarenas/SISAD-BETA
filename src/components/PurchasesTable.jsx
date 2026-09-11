import {
  formatCurrency,
} from "../utils/format";

function PurchasesTable({
  purchases,
  onMarkInTransit,
  onReceive,
}) {
  return (
    <div className="table-wrap">
      <table className="purchases-table">
        <thead>
          <tr>
            <th>Orden</th>
            <th>Proveedor</th>
            <th>Categoría</th>
            <th>Ítems</th>
            <th>Monto</th>
            <th>Fecha Orden</th>
            <th>Recepción</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td>
                <div className="item-name">
                  <span className="dot"></span>
                  {purchase.id}
                </div>
              </td>

              <td>{purchase.supplier}</td>

              <td>{purchase.category}</td>

              <td>{purchase.items.length}</td>

              <td>
                {formatCurrency(
                  purchase.amount
                )}
              </td>

              <td>
                {purchase.orderedDateLabel}
              </td>

              <td>
                {purchase.receiptDateLabel}
              </td>

              <td>
                <span
                  className={`status ${purchase.statusMeta.className}`}
                >
                  {
                    purchase.statusMeta.label
                  }
                </span>
              </td>

              <td>
                <div className="actions actions-wrap">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      onMarkInTransit(
                        purchase.id
                      )
                    }
                    disabled={
                      purchase.status !==
                      "pending"
                    }
                    aria-label={`Marcar ${purchase.id} en tránsito`}
                  >
                    En tránsito
                  </button>

                  <button
                    type="button"
                    className="primary-btn compact-btn"
                    onClick={() =>
                      onReceive(purchase)
                    }
                    disabled={
                      purchase.status ===
                      "received"
                    }
                    aria-label={`Registrar recepción de ${purchase.id}`}
                  >
                    Recibir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PurchasesTable;
