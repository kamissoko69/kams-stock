import api from "./api.js";

const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(Number(n) || 0);
const esc = v => String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

let S = { page: "dashboard", products: [], categories: [], sales: [], movements: [], d: { kpis: {}, chart: [] } };

function toast(message, error = false) {
  const t = $("#toast"); t.textContent = message; t.className = "toast show" + (error ? " err" : "");
  clearTimeout(window.__toast); window.__toast = setTimeout(() => t.className = "toast", 2800);
}

async function load() {
  [S.d, S.products, S.categories, S.sales, S.movements] = await Promise.all([
    api.request("/dashboard"), api.request("/products"), api.request("/categories"),
    api.request("/sales"), api.request("/stock")
  ]);
}

const head = (title, subtitle, actions = "") => `<div class="page-head"><div><small>KAMS STOCK / WORKSPACE</small><h1>${title}</h1><p>${subtitle}</p></div><div>${actions}</div></div>`;
const k = (label, value, meta, icon) => `<div class="k"><span>${label}</span><i data-lucide="${icon}"></i><b>${value}</b><small>${meta}</small></div>`;

function dashboard() {
  const d = S.d.kpis;
  return head("Vue d'ensemble", "La performance de votre activité, en un coup d'œil.", `<button class="btn ghost" id="refresh">↻ Actualiser</button> <button class="btn" id="sale">＋ Nouvelle vente</button>`) +
    `<div class="ks">${k("Chiffre d'affaires", money(d.todayRevenue), "Aujourd'hui", "wallet")} ${k("Bénéfice", money(d.todayProfit), "Aujourd'hui", "trending-up")} ${k("Ventes", d.todaySales || 0, "Aujourd'hui", "receipt")} ${k("Stock faible", d.lowStock || 0, d.lowStock ? "À réapprovisionner" : "Tout est bon", "triangle-alert")}</div>
    <div class="cols"><div class="panel"><div class="ph"><b>Performance commerciale</b><small>7 derniers jours</small></div><canvas id="chart"></canvas></div>
    <div class="panel"><div class="ph"><b>Alertes stock</b><small>À surveiller</small></div>${S.products.filter(p => p.low_stock).slice(0, 6).map(p => `<div class="alert"><span>◈</span><div><b>${esc(p.name)}</b><small>${esc(p.sku)}</small></div><strong>${p.stock_quantity} ${esc(p.unit)}</strong></div>`).join("") || '<div class="empty">Aucune alerte 🎉</div>'}</div></div>
    <div class="panel"><div class="ph"><b>Dernières ventes</b><button class="link" data-page="sales">Tout voir →</button></div>${saleRows(S.sales.slice(0, 7))}</div>`;
}

function saleRows(items) {
  return `<div class="table"><div class="tr th"><span>VENTE</span><span>CLIENT</span><span>PAIEMENT</span><span>TOTAL</span><span>BÉNÉFICE</span><span>DATE</span></div>${items.map(x => `<div class="tr"><span><b>#${x.id}</b></span><span>${esc(x.customer_name)}</span><span><em>${esc(x.payment_method)}</em></span><span><b>${money(x.total)}</b></span><span class="ok">+${money(x.profit)}</span><span>${new Date(x.created_at).toLocaleString("fr-FR")}</span></div>`).join("") || '<div class="empty">Aucune vente.</div>'}</div>`;
}

function products() {
  return head("Produits", "Catalogue, prix, marges et niveaux de stock.", `<button class="btn" id="product">＋ Nouveau produit</button>`) +
    `<div class="toolbar"><input id="search" placeholder="⌕  Rechercher nom ou SKU..."><select id="cat"><option value="">Toutes les catégories</option>${S.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
    <div class="panel"><div class="table"><div class="tr th"><span>PRODUIT</span><span>CATÉGORIE</span><span>ACHAT</span><span>VENTE</span><span>STOCK</span><span>ACTIONS</span></div>${S.products.map(p => `<div class="tr"><span><b>${esc(p.name)}</b><small>${esc(p.sku)}</small></span><span>${esc(p.category_name || "—")}</span><span>${money(p.purchase_price)}</span><span>${money(p.selling_price)}</span><span class="${p.low_stock ? "bad" : "ok"}">${p.stock_quantity} ${esc(p.unit)}</span><span><button class="iconbtn edit-product" data-id="${p.id}">✎</button> <button class="iconbtn danger delete-product" data-id="${p.id}">×</button></span></div>`).join("") || '<div class="empty">Aucun produit.</div>'}</div></div>`;
}

function stock() {
  return head("Mouvements", "Traçabilité complète des entrées et sorties.", `<button class="btn" id="move">＋ Mouvement</button>`) +
    `<div class="panel"><div class="table"><div class="tr th"><span>PRODUIT</span><span>TYPE</span><span>QTÉ</span><span>UTILISATEUR</span><span>NOTE</span><span>DATE</span></div>${S.movements.map(x => `<div class="tr"><span><b>${esc(x.product_name)}</b><small>${esc(x.sku)}</small></span><span class="${x.type === "IN" ? "ok" : "bad"}">${x.type === "IN" ? "ENTRÉE" : "SORTIE"}</span><span>${x.quantity}</span><span>${esc(x.user_name || "—")}</span><span>${esc(x.note || "—")}</span><span>${new Date(x.created_at).toLocaleString("fr-FR")}</span></div>`).join("") || '<div class="empty">Aucun mouvement.</div>'}</div></div>`;
}

function sales() {
  const revenue = S.sales.reduce((a, x) => a + Number(x.total), 0), profit = S.sales.reduce((a, x) => a + Number(x.profit), 0);
  return head("Ventes", "Transactions, paiements et rentabilité.", `<button class="btn" id="sale">＋ Nouvelle vente</button>`) +
    `<div class="ks three">${k("CA affiché", money(revenue), "Historique", "banknote")} ${k("Bénéfice", money(profit), "Historique", "coins")} ${k("Transactions", S.sales.length, "Historique", "receipt")}</div><div class="panel">${saleRows(S.sales)}</div>`;
}

function categories() {
  return head("Catégories", "Organisez votre activité par département.", `<button class="btn" id="catnew">＋ Nouvelle catégorie</button>`) +
    `<div class="catgrid">${S.categories.map(c => `<div class="catcard"><div class="caticon">▦</div><h3>${esc(c.name)}</h3><p>${esc(c.description || "Sans description")}</p><div class="catfoot"><b>${c.product_count} produit${c.product_count > 1 ? "s" : ""}</b><span><button class="link edit-cat" data-id="${c.id}">Modifier</button><button class="link danger-text delete-cat" data-id="${c.id}">Supprimer</button></span></div></div>`).join("") || '<div class="empty">Aucune catégorie.</div>'}</div>`;
}

function reports() {
  const rev = S.sales.reduce((a, x) => a + Number(x.total), 0), pr = S.sales.reduce((a, x) => a + Number(x.profit), 0);
  return head("Rapports & analyses", "Transformez vos données en décisions.", `<button class="btn ghost" id="export">↓ Exporter CSV</button>`) +
    `<div class="ks">${k("CA", money(rev), "Historique", "bar-chart-3")} ${k("Bénéfice", money(pr), "Historique", "coins")} ${k("Marge", rev ? Math.round(pr / rev * 100) + "%" : "0%", "Rentabilité", "percent")} ${k("Valeur du stock", money(S.d.kpis.stockValue), "Au prix d'achat", "package")}</div>
    <div class="cols"><div class="panel"><div class="ph"><b>Valeur des stocks</b></div>${S.products.map(p => `<div class="stockline"><span>${esc(p.name)}</span><b>${money(Number(p.stock_quantity) * Number(p.purchase_price))}</b></div>`).join("")}</div><div class="panel insight"><div>✦</div><h2>Insights KAMS</h2><p>${S.d.kpis.lowStock ? `Vous avez <b>${S.d.kpis.lowStock} produits</b> sous leur seuil minimum. Pensez à réapprovisionner.` : "Votre stock est actuellement sain. Continuez à surveiller les produits à forte rotation."}</p></div></div>`;
}

function modal(title, html, onSubmit) {
  $("#modal").innerHTML = `<div class="back"><div class="modal"><div class="mh"><b>${title}</b><button data-close>×</button></div>${html}</div></div>`;
  $("#modal").classList.remove("hidden");
  const form = $("#modal form"); if (form) form.addEventListener("submit", onSubmit);
}

function productModal(product = null) {
  const p = product || {};
  modal(product ? "Modifier le produit" : "Nouveau produit", `<form class="form">
    <label>Nom du produit</label><input name="name" value="${esc(p.name)}" placeholder="Ex : Smartphone KAMS X1" required>
    <label>SKU / référence</label><input name="sku" value="${esc(p.sku)}" placeholder="KMS-X1" required>
    <label>Catégorie</label><select name="category_id"><option value="">Sans catégorie</option>${S.categories.map(c => `<option value="${c.id}" ${String(c.id) === String(p.category_id) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
    <label>Unité</label><input name="unit" value="${esc(p.unit || "pièce")}" required>
    <div class="formgrid"><div><label>Prix achat</label><input name="purchase_price" type="number" min="0" value="${p.purchase_price ?? ""}" required></div><div><label>Prix vente</label><input name="selling_price" type="number" min="0" value="${p.selling_price ?? ""}" required></div></div>
    ${product ? "" : '<label>Stock initial</label><input name="stock_quantity" type="number" min="0" value="0">'}
    <label>Seuil minimum</label><input name="min_stock" type="number" min="0" value="${p.min_stock ?? 5}" required>
    <button class="btn">${product ? "Enregistrer les modifications" : "Créer le produit"}</button>
  </form>`, async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    for (const x of ["category_id","purchase_price","selling_price","stock_quantity","min_stock"]) d[x] = d[x] === "" || d[x] == null ? null : Number(d[x]);
    try { await api.request(product ? `/products/${product.id}` : "/products", { method: product ? "PUT" : "POST", body: JSON.stringify(d) }); close(); toast(product ? "Produit modifié" : "Produit créé"); await refresh(); }
    catch (err) { toast(err.message, true); }
  });
}

function categoryModal(category = null) {
  const c = category || {};
  modal(category ? "Modifier la catégorie" : "Nouvelle catégorie", `<form class="form"><label>Nom</label><input name="name" value="${esc(c.name)}" placeholder="Ex : Électronique" required><label>Description</label><textarea name="description" rows="4" placeholder="Description de la catégorie">${esc(c.description)}</textarea><button class="btn">${category ? "Enregistrer" : "Créer la catégorie"}</button></form>`, async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try { await api.request(category ? `/categories/${category.id}` : "/categories", { method: category ? "PUT" : "POST", body: JSON.stringify(d) }); close(); toast(category ? "Catégorie modifiée" : "Catégorie créée"); await refresh(); }
    catch (err) { toast(err.message, true); }
  });
}

function moveModal() {
  modal("Mouvement de stock", `<form class="form"><label>Produit</label><select name="product_id" required>${S.products.map(p => `<option value="${p.id}">${esc(p.name)} — stock ${p.stock_quantity}</option>`).join("")}</select><label>Type</label><select name="type"><option value="IN">Entrée</option><option value="OUT">Sortie</option></select><label>Quantité</label><input name="quantity" type="number" min="1" value="1" required><label>Note</label><input name="note" placeholder="Motif / fournisseur / raison"><button class="btn">Valider le mouvement</button></form>`, async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); d.product_id = Number(d.product_id); d.quantity = Number(d.quantity);
    try { await api.request("/stock", { method: "POST", body: JSON.stringify(d) }); close(); toast("Stock mis à jour"); await refresh(); } catch (err) { toast(err.message, true); }
  });
}

function saleModal() {
  let items = [];
  modal("Nouvelle vente", `<form id="saleForm" class="form"><label>Client</label><input name="customer_name" value="Client comptoir"><label>Produit</label><div class="inline"><select id="sp">${S.products.filter(p => Number(p.stock_quantity) > 0).map(p => `<option value="${p.id}">${esc(p.name)} — ${money(p.selling_price)} · stock ${p.stock_quantity}</option>`).join("")}</select><button type="button" class="btn ghost" id="add">＋ Ajouter</button></div><div id="cart" class="cart"></div><label>Remise</label><input name="discount" type="number" min="0" value="0"><h2 id="total">Total : 0 FCFA</h2><button class="btn">Encaisser la vente</button></form>`, async e => {
    e.preventDefault(); if (!items.length) return toast("Panier vide", true); const d = Object.fromEntries(new FormData(e.target)); d.discount = Number(d.discount); d.items = items.map(({product_id, quantity}) => ({ product_id, quantity }));
    try { await api.request("/sales", { method: "POST", body: JSON.stringify(d) }); close(); toast("Vente enregistrée"); await refresh(); } catch (err) { toast(err.message, true); }
  });
  const redraw = () => { $("#cart").innerHTML = items.map((i, idx) => `<div><span>${esc(i.name)} × ${i.quantity}</span><span><b>${money(i.price * i.quantity)}</b> <button type="button" class="remove-item" data-index="${idx}">×</button></span></div>`).join("") || "Panier vide"; $("#total").textContent = "Total : " + money(items.reduce((a, i) => a + i.price * i.quantity, 0)) + " FCFA"; };
  $("#add").onclick = () => { const p = S.products.find(x => x.id == $("#sp").value); if (!p) return; const i = items.find(x => x.product_id === p.id); if (i) { if (i.quantity >= Number(p.stock_quantity)) return toast("Stock maximum atteint", true); i.quantity++; } else items.push({ product_id: p.id, name: p.name, price: Number(p.selling_price), quantity: 1 }); redraw(); };
  $("#modal").addEventListener("click", e => { const b = e.target.closest(".remove-item"); if (b) { items.splice(Number(b.dataset.index), 1); redraw(); } });
  redraw();
}

function exportCSV() {
  const lines = [["ID","Client","Paiement","Sous-total","Remise","Total","Bénéfice","Date"], ...S.sales.map(s => [s.id,s.customer_name,s.payment_method,s.subtotal,s.discount,s.total,s.profit,new Date(s.created_at).toISOString()])];
  const blob = new Blob([lines.map(r => r.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "kams-stock-ventes.csv"; a.click(); URL.revokeObjectURL(a.href);
}

function close() { $("#modal").classList.add("hidden"); $("#modal").innerHTML = ""; }
async function refresh() { try { await load(); render(); } catch (e) { toast(e.message, true); } }

function render() {
  const fn = { dashboard, products, stock, sales, categories, reports }[S.page] || dashboard;
  $("#content").innerHTML = fn();
  document.querySelectorAll(".nav").forEach(x => x.classList.toggle("active", x.dataset.page === S.page));
  $("#date").textContent = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  if (window.lucide) lucide.createIcons();
  if (S.page === "dashboard" && window.Chart) new Chart($("#chart"), { type: "line", data: { labels: S.d.chart.map(x => x.day), datasets: [{ data: S.d.chart.map(x => x.revenue), tension: .35, fill: true, borderWidth: 3 }] }, options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#eee" } }, x: { grid: { display: false } } } } });
}

document.addEventListener("click", async e => {
  const n = e.target.closest("[data-page]"); if (n) { S.page = n.dataset.page; render(); return; }
  if (e.target.closest("#product")) return productModal();
  if (e.target.closest("#move")) return moveModal();
  if (e.target.closest("#sale")) return saleModal();
  if (e.target.closest("#catnew")) return categoryModal();
  if (e.target.closest("#refresh")) return refresh();
  if (e.target.closest("#export")) return exportCSV();
  if (e.target.closest("[data-close]")) return close();
  const ep = e.target.closest(".edit-product"); if (ep) { const p = S.products.find(x => x.id == ep.dataset.id); return productModal(p); }
  const dp = e.target.closest(".delete-product"); if (dp) { if (!confirm("Supprimer ce produit ?")) return; try { await api.request(`/products/${dp.dataset.id}`, {method:"DELETE"}); toast("Produit supprimé"); await refresh(); } catch (err) { toast(err.message,true); } return; }
  const ec = e.target.closest(".edit-cat"); if (ec) { const c = S.categories.find(x => x.id == ec.dataset.id); return categoryModal(c); }
  const dc = e.target.closest(".delete-cat"); if (dc) { if (!confirm("Supprimer cette catégorie ? Les produits seront conservés sans catégorie.")) return; try { await api.request(`/categories/${dc.dataset.id}`, {method:"DELETE"}); toast("Catégorie supprimée"); await refresh(); } catch (err) { toast(err.message,true); } }
});

document.addEventListener("input", e => { if (e.target.id === "search") { const q = e.target.value.toLowerCase(); document.querySelectorAll(".tr:not(.th)").forEach(row => row.style.display = row.textContent.toLowerCase().includes(q) ? "grid" : "none"); } });
document.addEventListener("change", e => { if (e.target.id === "cat") { const q = e.target.value; document.querySelectorAll(".tr:not(.th)").forEach(row => row.style.display = !q || row.textContent.includes(S.categories.find(c => String(c.id) === q)?.name || "") ? "grid" : "none"); } });

async function start() {
  if (!api.token) return;
  $("#login").classList.add("hidden"); $("#app").classList.remove("hidden");
  try { await load(); render(); } catch (e) { toast(e.message, true); }
}

$("#loginForm").onsubmit = async e => { e.preventDefault(); try { const d = await api.login($("#email").value, $("#password").value); api.token = d.token; localStorage.setItem("kams_token", d.token); $("#login").classList.add("hidden"); $("#app").classList.remove("hidden"); await load(); render(); } catch (x) { toast(x.message, true); } };
$("#logout").onclick = () => { localStorage.removeItem("kams_token"); location.reload(); };
start();
