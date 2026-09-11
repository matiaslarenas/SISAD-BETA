import { useEffect, useId, useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import type { Product } from "../types/inventory";
import { getStockStatus } from "../utils/stockCalculator";

interface InventoryTableProps {
  inventory?: Product[];
  onDelete?: (productId: string) => void;
  onEdit?: (product: Product) => void;
  onRestock?: (product: Product) => void;
  showActions?: boolean;
  searchable?: boolean;
  paginated?: boolean;
  pageSize?: number;
}

function InventoryTable({
  inventory = [],
  onDelete,
  onEdit,
  onRestock,
  showActions = true,
  searchable = false,
  paginated = false,
  pageSize = 20,
}: InventoryTableProps) {
  const searchInputId = useId();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-CL");
    if (!query) return inventory;

    return inventory.filter((item) =>
      [item.item, item.type, item.category, item.location]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("es-CL").includes(query))
    );
  }, [inventory, search]);

  const pageCount = paginated
    ? Math.max(1, Math.ceil(filteredInventory.length / pageSize))
    : 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, inventory]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const visibleInventory = paginated
    ? filteredInventory.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredInventory;
  const columnCount = 7 + (showActions ? 1 : 0) + (onRestock ? 1 : 0);

  return (
    <>
      {(searchable || paginated) && (
        <div className="inventory-table-toolbar">
          {searchable && (
            <label className="inventory-quick-search" htmlFor={searchInputId}>
              <Search size={18} aria-hidden="true" />
              <input
                id={searchInputId}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por producto, tipo o categoría..."
                aria-label="Buscar en estado de inventario"
              />
            </label>
          )}
          <span className="inventory-result-count">
            {filteredInventory.length} {filteredInventory.length === 1 ? "producto" : "productos"}
          </span>
        </div>
      )}

      <div className="table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Disponible</th>
              <th>Stock Mínimo</th>
              <th>Costo Unitario</th>
              <th>Estado</th>
              {onRestock ? <th>Acción</th> : null}
              {showActions ? <th>Acciones</th> : null}
            </tr>
          </thead>

          <tbody>
            {visibleInventory.map((item) => {
              const stockStatus = getStockStatus(item.onHand, item.minStock);
              const needsRestock = stockStatus.className === "danger" || stockStatus.className === "warning";

              return (
                <tr key={item.id}>
                  <td>
                    <div className="item-name">
                      <span className="dot"></span>
                      {item.item}
                    </div>
                  </td>
                  <td>{item.type}</td>
                  <td>{item.category}</td>
                  <td>{item.onHand} {item.purchaseUnit}</td>
                  <td>{item.minStock} {item.purchaseUnit}</td>
                  <td>${item.costPerUnit?.toLocaleString("es-CL")}</td>
                  <td>
                    <span className={`status ${stockStatus.className}`}>
                      {stockStatus.text}
                    </span>
                  </td>
                  {onRestock ? (
                    <td>
                      {needsRestock ? (
                        <button
                          type="button"
                          className="restock-btn"
                          onClick={() => onRestock(item)}
                          aria-label={`Reponer ${item.item}`}
                        >
                          <RotateCcw size={15} aria-hidden="true" />
                          Reponer
                        </button>
                      ) : (
                        <span className="not-applicable">—</span>
                      )}
                    </td>
                  ) : null}
                  {showActions ? (
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => onEdit?.(item)}
                          aria-label={`Editar ${item.item}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => onDelete?.(item.id)}
                          aria-label={`Eliminar ${item.item}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {visibleInventory.length === 0 && (
              <tr>
                <td className="table-empty-state" colSpan={columnCount}>
                  No se encontraron productos para “{search}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginated && filteredInventory.length > pageSize && (
        <nav className="table-pagination" aria-label="Paginación de inventario">
          <button
            type="button"
            className="mini-btn"
            onClick={() => setCurrentPage((page) => page - 1)}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <span>
            Página <strong>{currentPage}</strong> de {pageCount}
          </span>
          <button
            type="button"
            className="mini-btn"
            onClick={() => setCurrentPage((page) => page + 1)}
            disabled={currentPage === pageCount}
          >
            Siguiente
          </button>
        </nav>
      )}
    </>
  );
}

export default InventoryTable;
