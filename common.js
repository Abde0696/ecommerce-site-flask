// Fonctions partagées par toutes les pages : appel API, panier (localStorage), affichage.
const CART_KEY = "boutique_cart";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatPrice(value) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data && data.error) || "Erreur serveur");
  }
  return data;
}

function toast(message, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ----- Panier -----
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function addToCart(product) {
  const cart = getCart();
  const line = cart.find((l) => l.id === product.id);
  if (line) {
    if (line.qty >= product.stock) {
      toast("Stock maximum atteint pour ce produit", true);
      return;
    }
    line.qty += 1;
    line.stock = product.stock;
    line.price = product.price;
  } else {
    cart.push({
      id: product.id, name: product.name, price: product.price,
      emoji: product.emoji, stock: product.stock, qty: 1,
    });
  }
  saveCart(cart);
  toast(`« ${product.name} » ajouté au panier`);
}

function cartCount() {
  return getCart().reduce((sum, l) => sum + l.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (badge) badge.textContent = cartCount();
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
