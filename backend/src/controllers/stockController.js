import { query, tx } from "../config/database.js";

export async function movements(req, res) {
  const { rows } = await query(`
    SELECT m.*, p.name AS product_name, p.sku, u.name AS user_name
    FROM stock_movements m
    JOIN products p ON p.id=m.product_id
    LEFT JOIN users u ON u.id=m.user_id
    ORDER BY m.created_at DESC
    LIMIT 200
  `);
  res.json(rows);
}

export async function addMovement(req, res) {
  const product_id = Number(req.body.product_id);
  const type = String(req.body.type || "").toUpperCase();
  const quantity = Number(req.body.quantity);
  const note = String(req.body.note || "").trim();

  if (!product_id || !["IN", "OUT"].includes(type) || !Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Mouvement invalide." });
  }

  const movement = await tx(async client => {
    const q = await client.query("SELECT * FROM products WHERE id=$1 FOR UPDATE", [product_id]);
    const product = q.rows[0];
    if (!product) throw Object.assign(new Error("Produit introuvable."), { status: 404 });

    if (type === "OUT" && Number(product.stock_quantity) < quantity) {
      throw Object.assign(new Error(`Stock insuffisant pour ${product.name}.`), { status: 400 });
    }

    await client.query(
      "UPDATE products SET stock_quantity=stock_quantity+$1, updated_at=now() WHERE id=$2",
      [type === "IN" ? quantity : -quantity, product_id]
    );

    const { rows } = await client.query(`
      INSERT INTO stock_movements(product_id,user_id,type,quantity,note)
      VALUES($1,$2,$3,$4,$5) RETURNING *
    `, [product_id, req.user.id, type, quantity, note]);

    return rows[0];
  });

  res.status(201).json(movement);
}
