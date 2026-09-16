import { query } from "../config/database.js";

export async function dashboard(req, res) {
  const [products, lowStock, todaySales, today, chart, stockValue] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM products"),
    query("SELECT COUNT(*)::int AS count FROM products WHERE stock_quantity <= min_stock"),
    query("SELECT COUNT(*)::int AS count FROM sales WHERE created_at::date = CURRENT_DATE"),
    query(`SELECT COALESCE(SUM(total),0) AS total, COALESCE(SUM(profit),0) AS profit FROM sales WHERE created_at::date = CURRENT_DATE`),
    query(`
      SELECT TO_CHAR(d.day, 'DD/MM') AS day, COALESCE(SUM(s.total),0) AS revenue
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS d(day)
      LEFT JOIN sales s ON s.created_at::date = d.day::date
      GROUP BY d.day
      ORDER BY d.day
    `),
    query("SELECT COALESCE(SUM(stock_quantity * purchase_price),0) AS value FROM products")
  ]);

  res.json({
    kpis: {
      products: products.rows[0].count,
      lowStock: lowStock.rows[0].count,
      todaySales: todaySales.rows[0].count,
      todayRevenue: Number(today.rows[0].total),
      todayProfit: Number(today.rows[0].profit),
      stockValue: Number(stockValue.rows[0].value)
    },
    chart: chart.rows.map(x => ({ day: x.day, revenue: Number(x.revenue) }))
  });
}
