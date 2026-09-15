import { query, tx } from "../config/database.js";

export async function listSales(req, res) {
  const { rows } = await query(`
    SELECT
      s.*,
      u.name AS cashier,
      COALESCE(
        json_agg(
          json_build_object(
            'product_id', si.product_id,
            'product_name', p.name,
            'quantity', si.quantity,
            'unit_price', si.unit_price
          )
        ) FILTER (WHERE si.id IS NOT NULL),
        '[]'
      ) AS items
    FROM sales s
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    GROUP BY s.id, u.name
    ORDER BY s.created_at DESC
    LIMIT 100
  `);

  res.json(rows);
}

export async function createSale(req, res) {
  const {
    customer_name = "Client comptoir",
    payment_method = "CASH",
    discount = 0,
    items = []
  } = req.body;

  if (!items.length) {
    return res.status(400).json({
      message: "Panier vide."
    });
  }

  const sale = await tx(async (client) => {
    let subtotal = 0;
    let totalCost = 0;
    const products = [];

    for (const item of items) {
      const result = await client.query(
        "SELECT * FROM products WHERE id = $1 FOR UPDATE",
        [item.product_id]
      );

      const product = result.rows[0];
      const quantity = Number(item.quantity);

      if (!product) {
        throw Object.assign(
          new Error("Produit introuvable."),
          { status: 404 }
        );
      }

      if (quantity <= 0) {
        throw Object.assign(
          new Error("Quantité invalide."),
          { status: 400 }
        );
      }

      if (Number(product.stock_quantity) < quantity) {
        throw Object.assign(
          new Error(`Stock insuffisant pour ${product.name}.`),
          { status: 400 }
        );
      }

      subtotal += quantity * Number(product.selling_price);
      totalCost += quantity * Number(product.purchase_price);

      products.push({
        product,
        quantity
      });
    }

    const total = Math.max(
      0,
      subtotal - Number(discount)
    );

    const saleResult = await client.query(
      `
      INSERT INTO sales
      (
        user_id,
        customer_name,
        payment_method,
        subtotal,
        discount,
        total,
        profit
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        req.user.id,
        customer_name,
        payment_method,
        subtotal,
        discount,
        total,
        total - totalCost
      ]
    );

    const sale = saleResult.rows[0];

    for (const item of products) {
      await client.query(
        `
        INSERT INTO sale_items
        (
          sale_id,
          product_id,
          quantity,
          unit_price,
          cost_price
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          sale.id,
          item.product.id,
          item.quantity,
          item.product.selling_price,
          item.product.purchase_price
        ]
      );

      await client.query(
        `
        UPDATE products
        SET
          stock_quantity = stock_quantity - $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          item.quantity,
          item.product.id
        ]
      );

      await client.query(
        `
        INSERT INTO stock_movements
        (
          product_id,
          user_id,
          type,
          quantity,
          note
        )
        VALUES ($1, $2, 'OUT', $3, $4)
        `,
        [
          item.product.id,
          req.user.id,
          item.quantity,
          `Vente #${sale.id}`
        ]
      );
    }

    return sale;
  });

  res.status(201).json(sale);
}