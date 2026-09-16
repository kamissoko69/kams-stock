import { query, tx } from "../config/database.js";

export async function listSales(req, res) {
  const { rows } = await query(`
    SELECT s.*, u.name AS cashier,
      COALESCE(json_agg(json_build_object(
        'product_id',si.product_id,'product_name',p.name,
        'quantity',si.quantity,'unit_price',si.unit_price
      )) FILTER (WHERE si.id IS NOT NULL),'[]') AS items
    FROM sales s
    LEFT JOIN users u ON u.id=s.user_id
    LEFT JOIN sale_items si ON si.sale_id=s.id
    LEFT JOIN products p ON p.id=si.product_id
    GROUP BY s.id,u.name
    ORDER BY s.created_at DESC LIMIT 200
  `);
  res.json(rows);
}

export async function createSale(req, res) {
  const customer_name = String(req.body.customer_name || "Client comptoir").trim();
  const payment_method = String(req.body.payment_method || "CASH").toUpperCase();
  const discount = Number(req.body.discount || 0);
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!items.length) return res.status(400).json({ message: "Panier vide." });
  if (discount < 0) return res.status(400).json({ message: "Remise invalide." });

  const sale = await tx(async client => {
    let subtotal = 0;
    let cost = 0;
    const selected = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const qty = Number(item.quantity);
      if (!productId || !Number.isInteger(qty) || qty <= 0) {
        throw Object.assign(new Error("Article de vente invalide."), { status: 400 });
      }

      const q = await client.query("SELECT * FROM products WHERE id=$1 FOR UPDATE", [productId]);
      const p = q.rows[0];
      if (!p) throw Object.assign(new Error("Produit introuvable."), { status: 404 });
      if (Number(p.stock_quantity) < qty) throw Object.assign(new Error(`Stock insuffisant pour ${p.name}.`), { status: 400 });

      subtotal += qty * Number(p.selling_price);
      cost += qty * Number(p.purchase_price);
      selected.push({ p, qty });
    }

    if (discount > subtotal) throw Object.assign(new Error("La remise dépasse le total."), { status: 400 });
    const total = subtotal - discount;

    const saleResult = await client.query(`
      INSERT INTO sales(user_id,customer_name,payment_method,subtotal,discount,total,profit)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [req.user.id, customer_name, payment_method, subtotal, discount, total, total - cost]);

    const sale = saleResult.rows[0];

    for (const { p, qty } of selected) {
      await client.query(`
        INSERT INTO sale_items(sale_id,product_id,quantity,unit_price,cost_price)
        VALUES($1,$2,$3,$4,$5)
      `, [sale.id, p.id, qty, p.selling_price, p.purchase_price]);

      await client.query(
        "UPDATE products SET stock_quantity=stock_quantity-$1,updated_at=now() WHERE id=$2",
        [qty, p.id]
      );

      await client.query(`
        INSERT INTO stock_movements(product_id,user_id,type,quantity,note)
        VALUES($1,$2,'OUT',$3,$4)
      `, [p.id, req.user.id, qty, `Vente #${sale.id}`]);
    }

    return sale;
  });

  res.status(201).json(sale);
}
