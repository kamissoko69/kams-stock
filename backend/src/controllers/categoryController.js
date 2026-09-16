import { query } from "../config/database.js";

export async function listCategories(req, res) {
  const { rows } = await query(`
    SELECT c.*, COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);
  res.json(rows);
}

export async function createCategory(req, res) {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  if (!name) return res.status(400).json({ message: "Le nom de la catégorie est requis." });
  const { rows } = await query(
    "INSERT INTO categories(name, description) VALUES($1,$2) RETURNING *",
    [name, description]
  );
  res.status(201).json(rows[0]);
}

export async function updateCategory(req, res) {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  if (!name) return res.status(400).json({ message: "Le nom de la catégorie est requis." });
  const { rows } = await query(
    "UPDATE categories SET name=$1, description=$2, updated_at=now() WHERE id=$3 RETURNING *",
    [name, description, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ message: "Catégorie introuvable." });
  res.json(rows[0]);
}

export async function deleteCategory(req, res) {
  const result = await query("DELETE FROM categories WHERE id=$1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ message: "Catégorie introuvable." });
  res.json({ message: "Catégorie supprimée." });
}
