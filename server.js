const express = require('express');
const algoliasearch = require('algoliasearch');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const PORT = process.env.PORT || 3000;

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID, 
  process.env.ALGOLIA_ADMIN_KEY
);
const productsIndex = client.initIndex('products');
const sellersIndex = client.initIndex('sellers');

// Armazenamento em memória (para MVP)
let adminPassword = "admin123"; // ← Altere para algo seguro em produção
let wishlists = [];

// ✅ NOVA ROTA: Painel do administrador
app.get('/admin/overview', (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: "Acesso não autorizado" });
  }

  // Simula dados para o admin
  res.json({
    sellers: [
      { id: "1716543210000", name: "Loja Vinyl", plan: "Starter", phone: "11999999999", createdAt: "2025-04-20T10:00:00Z" }
    ],
    products: [
      { id: "1716543210001", title: "Abbey Road", seller_name: "Loja Vinyl", price: 150.00, createdAt: "2025-04-20T10:05:00Z" }
    ],
    totalSellers: 1,
    totalProducts: 1
  });
});

app.get('/search', async (req, res) => {
  try {
    const { q = '' } = req.query;
    const response = await productsIndex.search(q);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Falha na busca" });
  }
});

// ✅ CORRIGIDO: Busca por seller_id como número
app.get('/sellers/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const idNum = isNaN(id) ? id : Number(id);
    const response = await productsIndex.search('', {
      filters: `seller_id:${idNum}`
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/sellers', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const id = Date.now();

    await sellersIndex.saveObject({
      objectID: id,
      name,
      phone,
      createdAt: new Date().toISOString()
    });

    res.json({ id, name }); // ← número, não string
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ CORRIGIDO: seller_id como número
app.post('/products', async (req, res) => {
  try {
    const { title, artist, price, seller_id } = req.body;
    const id = Date.now();

    let seller_name = 'Loja Vinyl Collect';
    if (seller_id) {
      try {
        const seller = await sellersIndex.getObject(Number(seller_id));
        seller_name = seller.name;
      } catch (err) {}
    }

    await productsIndex.saveObject({
      objectID: id,
      title,
      artist,
      price: parseFloat(price) || 0,
      seller_id: Number(seller_id), // ← número
      seller_name,
      seller_phone: req.body.seller_phone || '11999999999'
    });

    res.json({ id, seller_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Vinyl Collect API rodando em http://localhost:${PORT}`);
  console.log(`🔐 Admin: GET /admin/overview com Authorization: Bearer admin123`);
});
