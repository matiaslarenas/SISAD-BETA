function SuppliersTable({
    suppliers,
    onEdit,
    onDelete,
}) {
    const getComplianceClass = (
        compliance
    ) => {
        const value = Number.parseInt(
            compliance
        );

        if (value >= 95) {
            return "compliance-high";
        }

        if (value >= 90) {
            return "compliance-medium";
        }

        return "compliance-low";
    };

    return (
        <div className="table-wrap">
            <table className="suppliers-table">
                <thead>
                    <tr>
                        <th>Proveedor</th>
                        <th>Categoría</th>
                        <th>Lead Time</th>
                        <th>Cumplimiento</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                <tbody>
                    {suppliers.map((supplier) => (
                        <tr key={supplier.id}>
                            <td>
                                <div className="item-name">
                                    <span className="dot"></span>

                                    <span className="supplier-name">
                                        {supplier.name}
                                    </span>
                                </div>
                            </td>

                            <td>
                                {supplier.category}
                            </td>

                            <td>
                                {supplier.leadTime}
                            </td>

                            <td>
                                <span
                                    className={getComplianceClass(
                                        supplier.compliance
                                    )}
                                >
                                    {supplier.compliance}
                                </span>
                            </td>

                            <td>
                                <div className="actions">
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() =>
                                            onEdit(supplier)
                                        }
                                        aria-label={`Editar ${supplier.name}`}
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        className="danger-btn"
                                        onClick={() =>
                                            onDelete(supplier.id)
                                        }
                                        aria-label={`Eliminar ${supplier.name}`}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </td>

                            <td>
                                <span
                                    className={`status ${supplier.statusClass}`}
                                >
                                    {supplier.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default SuppliersTable;