import { query, tx } from "../config/database.js";

export async function listProducts(req, res) {
  const { search = "", category = "" } = req.query;
  const { rows } = await query(`
    SELECT p.*, c.name AS category_name,
      (p.stock_quantity <= p.min_stock) AS low_stock,
      ROUND(p.selling_price - p.purchase_price, 2) AS unit_margin
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ($1='' OR p.name ILIKE '%'||$1||'%' OR p.sku ILIKE '%'||$1||'%')
      AND ($2='' OR p.category_id::text=$2)
    ORDER BY p.created_at DESC
  `, [search, category]);
  res.json(rows);
}

export async function getProduct(req, res) {
  const { rows } = await query(`
    SELECT p.*, c.name AS category_name
    FROM products p LEFT JOIN categories c ON c.id=p.category_id
    WHERE p.id=$1
  `, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Produit introuvable." });
  res.json(rows[0]);
}

export async function createProduct(req, res) {
  const {
    name, sku, category_id, purchase_price, selling_price,
    stock_quantity = 0, min_stock = 5, unit = "pièce"
  } = req.body;

  if (!String(name || "").trim() || !String(sku || "").trim()) {
    return res.status(400).json({ message: "Nom et SKU requis." });
  }
  if (Number(purchase_price) < 0 || Number(selling_price) < 0 || Number(stock_quantity) < 0 || Number(min_stock) < 0) {
    return res.status(400).json({ message: "Les valeurs numériques sont invalides." });
  }

  const product = await tx(async client => {
    const { rows } = await client.query(`
      INSERT INTO products(name,sku,category_id,purchase_price,selling_price,stock_quantity,min_stock,unit)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [
      String(name).trim(), String(sku).trim().toUpperCase(), category_id || null,
      Number(purchase_price), Number(selling_price), Number(stock_quantity), Number(min_stock), String(unit || "pièce").trim()
    ]);

    if (Number(stock_quantity) > 0) {
      await client.query(`
        INSERT INTO stock_movements(product_id,user_id,type,quantity,note)
        VALUES($1,$2,'IN',$3,'Stock initial')
      `, [rows[0].id, req.user.id, Number(stock_quantity)]);
    }
    return rows[0];
  });

  res.status(201).json(product);
}

export async function updateProduct(req, res) {
  const { name, sku, category_id, purchase_price, selling_price, min_stock, unit } = req.body;
  const { rows } = await query(`
    UPDATE products SET name=$1,sku=$2,category_id=$3,purchase_price=$4,
      selling_price=$5,min_stock=$6,unit=$7,updated_at=now()
    WHERE id=$8 RETURNING *
  `, [name, String(sku || "").toUpperCase(), category_id || null, purchase_price, selling_price, min_stock, unit, req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Produit introuvable." });
  res.json(rows[0]);
}

export async function deleteProduct(req, res) {
  const result = await query("DELETE FROM products WHERE id=$1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: "Produit introuvable." });
  res.json({ message: "Produit supprimé." });
}
