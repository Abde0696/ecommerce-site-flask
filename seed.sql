INSERT INTO categories (name) VALUES
    ('Électronique'),
    ('Vêtements'),
    ('Maison'),
    ('Sport');

INSERT INTO products (name, description, price, stock, emoji, category_id) VALUES
    ('Casque audio sans fil', 'Bluetooth, réduction de bruit, 30 h d''autonomie.', 79.90, 15, '🎧', 1),
    ('Montre connectée', 'Suivi d''activité, notifications et GPS intégré.', 129.00, 8, '⌚', 1),
    ('Enceinte portable', 'Étanche, 12 h d''autonomie, son 360°.', 49.50, 20, '🔊', 1),
    ('T-shirt coton bio', 'Coupe droite, 100 % coton biologique.', 19.99, 40, '👕', 2),
    ('Veste imperméable', 'Légère et respirante, idéale pour la pluie.', 69.00, 12, '🧥', 2),
    ('Baskets running', 'Semelle amortissante, usage route.', 89.90, 18, '👟', 2),
    ('Lampe de bureau LED', 'Intensité réglable, port USB.', 29.90, 25, '💡', 3),
    ('Set de 4 tasses', 'Céramique, compatible lave-vaisselle.', 24.00, 30, '☕', 3),
    ('Tapis de yoga', 'Antidérapant, 6 mm d''épaisseur.', 22.50, 35, '🧘', 4),
    ('Ballon de football', 'Taille 5, coutures renforcées.', 17.90, 0, '⚽', 4);
