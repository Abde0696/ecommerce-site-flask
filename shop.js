// Page catalogue : catégories, recherche, liste des produits.
const state = { category: null, q: "" };
let categories = [];
let productsById = {};

function renderChips() {
  const box = document.getElementById("categories");
  box.innerHTML = "";
  const all = [{ id: null, name: "Toutes" }, ...categories];
  all.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (state.category === c.id ? " active" : "");
    btn.textContent = c.name;
    btn.addEventListener("click", () => {
      state.category = c.id;
      renderChips();
      loadProducts();
    });
    box.appendChild(btn);
  });
}

function productCard(p) {
  const action = p.stock > 0
    ? `<button class="btn" data-id="${p.id}">Ajouter</button>`
    : `<span class="out">Rupture de stock</span>`;
  return `
    <article class="card">
      <div class="card-emoji">${escapeHtml(p.emoji)}</div>
      <span class="tag">${escapeHtml(p.category)}</span>
      <h3>${escapeHtml(p.name)}</h3>
      <p class="desc">${escapeHtml(p.description)}</p>
      <div class="card-footer"><strong>${formatPrice(p.price)}</strong>${action}</div>
    </article>`;
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.q) params.set("q", state.q);
  const grid = document.getElementById("products");
  try {
    const products = await api("/products?" + params.toString());
    productsById = Object.fromEntries(products.map((p) => [p.id, p]));
    grid.innerHTML = products.length
      ? products.map(productCard).join("")
      : '<p class="empty">Aucun produit ne correspond à votre recherche.</p>';
  } catch (err) {
    grid.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("products").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-id]");
    if (btn) addToCart(productsById[btn.dataset.id]);
  });

  let timer;
  document.getElementById("search").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = e.target.value.trim();
      loadProducts();
    }, 250);
  });

  try {
    categories = await api("/categories");
  } catch (err) {
    toast(err.message, true);
  }
  renderChips();
  loadProducts();
});
