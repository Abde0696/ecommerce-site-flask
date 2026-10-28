"""API Flask + base SQLite pour la boutique en ligne."""
import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, request

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder="static", static_url_path="")
app.config["DATABASE"] = str(BASE_DIR / "shop.db")


class ValidationError(Exception):
    """Données invalides envoyées par le client (erreur 400)."""


@app.errorhandler(ValidationError)
def handle_validation_error(err):
    return jsonify({"error": str(err)}), 400


# ---------------------------------------------------------------- base de données
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Crée la base (tables + données d'exemple) si elle n'existe pas encore."""
    path = Path(app.config["DATABASE"])
    if path.exists():
        return
    con = sqlite3.connect(path)
    con.executescript((BASE_DIR / "schema.sql").read_text(encoding="utf-8"))
    con.executescript((BASE_DIR / "seed.sql").read_text(encoding="utf-8"))
    con.commit()
    con.close()


# ---------------------------------------------------------------- validation
def read_product(data):
    name = str(data.get("name", "")).strip()
    if not name:
        raise ValidationError("Le nom du produit est obligatoire.")
    try:
        price = round(float(data.get("price")), 2)
    except (TypeError, ValueError):
        raise ValidationError("Le prix est invalide.")
    if price < 0:
        raise ValidationError("Le prix ne peut pas être négatif.")
    try:
        stock = int(data.get("stock", 0))
    except (TypeError, ValueError):
        raise ValidationError("Le stock est invalide.")
    if stock < 0:
        raise ValidationError("Le stock ne peut pas être négatif.")
    try:
        category_id = int(data.get("category_id"))
    except (TypeError, ValueError):
        raise ValidationError("La catégorie est obligatoire.")
    if get_db().execute("SELECT 1 FROM categories WHERE id = ?", (category_id,)).fetchone() is None:
        raise ValidationError("Cette catégorie n'existe pas.")
    return {
        "name": name,
        "description": str(data.get("description", "")).strip(),
        "price": price,
        "stock": stock,
        "emoji": (str(data.get("emoji", "")).strip() or "📦")[:8],
        "category_id": category_id,
    }


PRODUCT_SELECT = """
    SELECT p.id, p.name, p.description, p.price, p.stock, p.emoji,
           p.category_id, c.name AS category
    FROM products p JOIN categories c ON c.id = p.category_id
"""


# ---------------------------------------------------------------- pages
@app.route("/")
def home():
    return app.send_static_file("index.html")


# ---------------------------------------------------------------- catégories
@app.get("/api/categories")
def list_categories():
    rows = get_db().execute(
        """SELECT c.id, c.name, COUNT(p.id) AS product_count
           FROM categories c LEFT JOIN products p ON p.category_id = c.id
           GROUP BY c.id ORDER BY c.name"""
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/categories")
def create_category():
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()
    if not name:
        raise ValidationError("Le nom de la catégorie est obligatoire.")
    db = get_db()
    try:
        cur = db.execute("INSERT INTO categories (name) VALUES (?)", (name,))
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "Cette catégorie existe déjà."}), 409
    return jsonify({"id": cur.lastrowid, "name": name}), 201


@app.delete("/api/categories/<int:category_id>")
def delete_category(category_id):
    db = get_db()
    if db.execute("SELECT 1 FROM products WHERE category_id = ?", (category_id,)).fetchone():
        return jsonify({"error": "Impossible : cette catégorie contient des produits."}), 409
    cur = db.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Catégorie introuvable."}), 404
    return "", 204


# ---------------------------------------------------------------- produits
@app.get("/api/products")
def list_products():
    sql, params, where = PRODUCT_SELECT, [], []
    category = request.args.get("category", type=int)
    if category:
        where.append("p.category_id = ?")
        params.append(category)
    q = request.args.get("q", "").strip()
    if q:
        where.append("(p.name LIKE ? OR p.description LIKE ?)")
        params += [f"%{q}%", f"%{q}%"]
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY p.id"
    rows = get_db().execute(sql, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/products/<int:product_id>")
def get_product(product_id):
    row = get_db().execute(PRODUCT_SELECT + " WHERE p.id = ?", (product_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Produit introuvable."}), 404
    return jsonify(dict(row))


@app.post("/api/products")
def create_product():
    p = read_product(request.get_json(silent=True) or {})
    db = get_db()
    cur = db.execute(
        """INSERT INTO products (name, description, price, stock, emoji, category_id)
           VALUES (:name, :description, :price, :stock, :emoji, :category_id)""",
        p,
    )
    db.commit()
    response = get_product(cur.lastrowid)
    response.status_code = 201
    return response


@app.put("/api/products/<int:product_id>")
def update_product(product_id):
    p = read_product(request.get_json(silent=True) or {})
    db = get_db()
    cur = db.execute(
        """UPDATE products SET name = :name, description = :description, price = :price,
               stock = :stock, emoji = :emoji, category_id = :category_id
           WHERE id = :id""",
        dict(p, id=product_id),
    )
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Produit introuvable."}), 404
    return get_product(product_id)


@app.delete("/api/products/<int:product_id>")
def delete_product(product_id):
    db = get_db()
    cur = db.execute("DELETE FROM products WHERE id = ?", (product_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "Produit introuvable."}), 404
    return "", 204


# ---------------------------------------------------------------- commandes
@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True) or {}
    name = str(data.get("customer_name", "")).strip()
    email = str(data.get("email", "")).strip()
    if not name:
        raise ValidationError("Le nom est obligatoire.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise ValidationError("L'adresse e-mail est invalide.")

    items = data.get("items")
    if not isinstance(items, list) or not items:
        raise ValidationError("Le panier est vide.")

    # Fusionne les lignes qui concernent le même produit
    quantities = {}
    for item in items:
        try:
            product_id, quantity = int(item["product_id"]), int(item["quantity"])
        except (KeyError, TypeError, ValueError):
            raise ValidationError("Panier invalide.")
        if quantity <= 0:
            raise ValidationError("Quantité invalide.")
        quantities[product_id] = quantities.get(product_id, 0) + quantity

    db = get_db()
    try:
        # Les prix viennent TOUJOURS de la base, jamais du navigateur.
        lines, total = [], 0.0
        for product_id, quantity in quantities.items():
            product = db.execute(
                "SELECT id, name, price, stock FROM products WHERE id = ?", (product_id,)
            ).fetchone()
            if product is None:
                raise ValidationError("Un produit de votre panier n'existe plus.")
            if product["stock"] < quantity:
                raise ValidationError(
                    f"Stock insuffisant pour « {product['name']} » (reste {product['stock']})."
                )
            lines.append((product, quantity))
            total += product["price"] * quantity
        total = round(total, 2)

        cur = db.execute(
            "INSERT INTO orders (customer_name, email, total) VALUES (?, ?, ?)",
            (name, email, total),
        )
        order_id = cur.lastrowid
        for product, quantity in lines:
            updated = db.execute(
                "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
                (quantity, product["id"], quantity),
            )
            if updated.rowcount == 0:
                raise ValidationError(f"Stock insuffisant pour « {product['name']} ».")
            db.execute(
                """INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
                   VALUES (?, ?, ?, ?, ?)""",
                (order_id, product["id"], product["name"], product["price"], quantity),
            )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return jsonify({"id": order_id, "total": total}), 201


@app.get("/api/orders")
def list_orders():
    db = get_db()
    orders = [dict(o) for o in db.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()]
    for order in orders:
        rows = db.execute(
            "SELECT product_name, unit_price, quantity FROM order_items WHERE order_id = ?",
            (order["id"],),
        ).fetchall()
        order["items"] = [dict(r) for r in rows]
    return jsonify(orders)


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
