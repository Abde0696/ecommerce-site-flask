// Page panier : modification des quantités, total, validation de la commande.
function renderCart() {
  const cart = getCart();
  const box = document.getElementById("cart-content");
  const checkout = document.getElementById("checkout");

  if (cart.length === 0) {
    box.innerHTML = '<p class="empty">Votre panier est vide. <a href="/">Continuer mes achats</a></p>';
    checkout.hidden = true;
    return;
  }
  checkout.hidden = false;

  const rows = cart.map((l) => `
    <tr>
      <td>${escapeHtml(l.emoji)} ${escapeHtml(l.name)}</td>
      <td>${formatPrice(l.price)}</td>
      <td>
        <span class="qty">
          <button data-action="minus" data-id="${l.id}" aria-label="Diminuer">−</button>
          ${l.qty}
          <button data-action="plus" data-id="${l.id}" aria-label="Augmenter">+</button>
        </span>
      </td>
      <td>${formatPrice(l.price * l.qty)}</td>
      <td><button class="btn danger small" data-action="remove" data-id="${l.id}">Retirer</button></td>
    </tr>`).join("");
  const total = cart.reduce((sum, l) => sum + l.price * l.qty, 0);

  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Produit</th><th>Prix</th><th>Quantité</th><th>Sous-total</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="total-row">Total : ${formatPrice(total)}</div>`;
}

function changeQuantity(id, action) {
  let cart = getCart();
  const line = cart.find((l) => String(l.id) === String(id));
  if (!line) return;
  if (action === "plus") {
    if (line.qty >= line.stock) {
      toast("Stock maximum atteint pour ce produit", true);
      return;
    }
    line.qty += 1;
  } else if (action === "minus") {
    line.qty -= 1;
  } else if (action === "remove") {
    line.qty = 0;
  }
  cart = cart.filter((l) => l.qty > 0);
  saveCart(cart);
  renderCart();
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.target;
  const items = getCart().map((l) => ({ product_id: l.id, quantity: l.qty }));
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const order = await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        customer_name: form.customer_name.value,
        email: form.email.value,
        items,
      }),
    });
    clearCart();
    document.getElementById("cart-page").innerHTML = `
      <div class="panel success">
        <div class="big">✅</div>
        <h2>Merci pour votre commande !</h2>
        <p>Commande n°${order.id} — total ${formatPrice(order.total)}.</p>
        <a class="btn" href="/">Retour à la boutique</a>
      </div>`;
  } catch (err) {
    toast(err.message, true);
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("cart-content").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (btn) changeQuantity(btn.dataset.id, btn.dataset.action);
  });
  document.getElementById("checkout-form").addEventListener("submit", submitOrder);
  renderCart();
});
