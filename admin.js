// Page d'administration : catégories, produits (CRUD) et liste des commandes.
let categories = [];
let products = [];

async function refresh() {
  try {
    [categories, products] = await Promise.all([api("/categories"), api("/products")]);
    renderCategories();
    renderProducts();
    renderOrders(await api("/orders"));
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Catégories ----------
function renderCategories() {
  document.getElementById("category-list").innerHTML = categories.length
    ? categories.map((c) => `
        <li>${escapeHtml(c.name)} <small>(${c.product_count} produit${c.product_count > 1 ? "s" : ""})</small>
          <button class="btn danger small" data-del-category="${c.id}">Supprimer</button>
        </li>`).join("")
    : '<li class="empty">Aucune catégorie.</li>';

  const select = document.getElementById("category_id");
  const current = select.value;
  select.innerHTML = categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  if (current) select.value = current;
}

async function addCategory(event) {
  event.preventDefault();
  const input = event.target.name;
  try {
    await api("/categories", { method: "POST", body: JSON.stringify({ name: input.value }) });
    input.value = "";
    toast("Catégorie ajoutée");
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteCategory(id) {
  if (!confirm("Supprimer cette catégorie ?")) return;
  try {
    await api("/categories/" + id, { method: "DELETE" });
    toast("Catégorie supprimée");
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Produits ----------
function renderProducts() {
  document.getElementById("product-rows").innerHTML = products.map((p) => `
    <tr>
      <td>${escapeHtml(p.emoji)} ${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${formatPrice(p.price)}</td>
      <td>${p.stock}</td>
      <td class="actions">
        <button class="btn secondary small" data-edit="${p.id}">Modifier</button>
        <button class="btn danger small" data-del-product="${p.id}">Supprimer</button>
      </td>
    </tr>`).join("");
}

function resetProductForm() {
  const form = document.getElementById("product-form");
  form.reset();
  form.product_id.value = "";
  document.getElementById("form-title").textContent = "Ajouter un produit";
  document.getElementById("cancel-edit").hidden = true;
}

function editProduct(id) {
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return;
  const form = document.getElementById("product-form");
  form.product_id.value = p.id;
  form.name.value = p.name;
  form.description.value = p.description;
  form.price.value = p.price;
  form.stock.value = p.stock;
  form.emoji.value = p.emoji;
  form.category_id.value = p.category_id;
  document.getElementById("form-title").textContent = "Modifier « " + p.name + " »";
  document.getElementById("cancel-edit").hidden = false;
  form.scrollIntoView({ behavior: "smooth" });
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.product_id.value;
  const body = JSON.stringify({
    name: form.name.value,
    description: form.description.value,
    price: form.price.value,
    stock: form.stock.value,
    emoji: form.emoji.value,
    category_id: form.category_id.value,
  });
  try {
    await api(id ? "/products/" + id : "/products", { method: id ? "PUT" : "POST", body });
    toast(id ? "Produit modifié" : "Produit ajouté");
    resetProductForm();
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteProduct(id) {
  if (!confirm("Supprimer ce produit ?")) return;
  try {
    await api("/products/" + id, { method: "DELETE" });
    toast("Produit supprimé");
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Commandes ----------
function renderOrders(orders) {
  document.getElementById("orders").innerHTML = orders.length
    ? orders.map((o) => `
        <div class="order">
          <strong>Commande n°${o.id}</strong> — ${escapeHtml(o.customer_name)}
          (${escapeHtml(o.email)}) — <strong>${formatPrice(o.total)}</strong><br>
          <small>${escapeHtml(o.created_at)}</small>
          <ul>${o.items.map((i) =>
            `<li>${i.quantity} × ${escapeHtml(i.product_name)} (${formatPrice(i.unit_price)})</li>`).join("")}</ul>
        </div>`).join("")
    : '<p class="empty">Aucune commande pour le moment.</p>';
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("category-form").addEventListener("submit", addCategory);
  document.getElementById("product-form").addEventListener("submit", saveProduct);
  document.getElementById("cancel-edit").addEventListener("click", resetProductForm);

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.delCategory) deleteCategory(t.dataset.delCategory);
    if (t.dataset.delProduct) deleteProduct(t.dataset.delProduct);
    if (t.dataset.edit) editProduct(t.dataset.edit);
  });
  refresh();
});
