const API_URL = "/api";

async function request(url, options = {}) {
  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error("Réponse non-JSON reçue du serveur:", text);
    throw new Error("Le serveur a renvoyé du HTML au lieu de JSON. Vérifie les routes backend.");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Erreur serveur");
  }

  return data;
}

async function fetchStats() {
  return request("/dashboard/stats");
}

async function fetchProducts() {
  return request("/products");
}

async function fetchCategories() {
  return request("/categories");
}

async function createProduct(data) {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

async function createCategory(data) {
  return request("/categories", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

async function createStockMovement(data) {
  return request("/stock/movement", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

async function fetchMovements() {
  return request("/stock/movements");
}

async function fetchSales() {
  return request("/sales");
}

async function createSale(data) {
  return request("/sales", {
    method: "POST",
    body: JSON.stringify(data)
  });
}