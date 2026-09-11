import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";

function ReportsCharts({ data }) {
    return (
        <div
            style={{
                width: "100%",
                height: 350,
            }}
        >
            <ResponsiveContainer
                width="100%"
                height="100%"
            >
                <BarChart data={data}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                    />

                    <XAxis dataKey="month" />

                    <YAxis />

                    <Tooltip />

                    <Legend />

                    <Bar
                        dataKey="orders"
                        fill="#1d6951"
                        name="Pedidos"
                    />

                    <Bar
                        dataKey="wasteValue"
                        fill="#ffb84d"
                        name="Merma"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default ReportsCharts;