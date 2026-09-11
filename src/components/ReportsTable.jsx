function ReportsTable({ reports }) {
    return (
        <div className="table-wrap">
            <table className="reports-table">
                <thead>
                    <tr>
                        <th>Mes</th>
                        <th>Pedidos</th>
                        <th>Costo Inventario</th>
                        <th>Merma</th>
                        <th>Estado</th>
                    </tr>
                </thead>

                <tbody>
                    {reports.map((report) => (
                        <tr key={report.month}>
                            <td>
                                <div className="item-name">
                                    <span className="dot"></span>
                                    {report.month}
                                </div>
                            </td>

                            <td>{report.orders}</td>

                            <td>{report.inventoryCost}</td>

                            <td>{report.waste}</td>

                            <td>
                                <span
                                    className={`status ${report.status}`}
                                >
                                    {report.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ReportsTable;