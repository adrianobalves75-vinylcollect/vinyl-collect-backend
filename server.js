const express = require('express');
const algoliasearch = require('algoliasearch');
require('dotenv').config();

const app = express();
app.use(express.json());

// Habilita CORS
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

let wishlists = [];

app.get('/', (req, res) => {
  res.json({ message: "Vinyl Collect API - Backend ativo!" });
});

app.get('/search', async (req, res) => {
  try {
    const { q = '', page = 0, hitsPerPage = 20 } = req.query;
    const response = await productsIndex.search(q, {
      page: parseInt(page),
      hitsPerPage: parseInt(hitsPerPage)
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "Falha na busca" });
  }
});

// ✅ CORRIGIDO: Busca por seller_id como número
app.get('/sellers/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    // Tenta converter para número para buscar no Algolia
    const idNum = isNaN(id) ? id : parseInt(id);
    const response = await productsIndex.search('', {
      filters: `seller_id:${idNum}`
    });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/wishlists', (req, res) => {
  res.json(wishlists);
});

app.post('/wishlists', (req, res) => {
  try {
    const { buyer_name, buyer_phone, album } = req.body;
    if (!buyer_phone || !album) {
      return res.status(400).json({ error: "WhatsApp e álbum são obrigatórios" });
    }

    const newWishlist = {
      id: Date.now().toString(),
      buyer_name: buyer_name || 'Comprador',
      buyer_phone,
      album,
      created_at: new Date().toISOString()
    };

    wishlists.push(newWishlist);
    res.json({ success: true, id: newWishlist.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ CORRIGIDO: Converte seller_id para número antes de salvar
app.post('/products', async (req, res) => {
  try {
    const { title, artist, year, condition, price, description, imageUrl, seller_id } = req.body;
    const id = Date.now().toString();

    // ✅ CORREÇÃO PRINCIPAL: converte seller_id para número
    const sellerIdNum = typeof seller_id === 'string' && !isNaN(seller_id) 
      ? parseInt(seller_id) 
      : seller_id;

    let seller_name = 'Loja Vinyl Collect';
    if (sellerIdNum && !isNaN(sellerIdNum)) {
      try {
        const seller = await sellersIndex.getObject(sellerIdNum);
        seller_name = seller.name || seller_name;
      } catch (err) {
        console.warn(`Vendedor ID ${sellerIdNum} não encontrado`);
      }
    }

    await productsIndex.saveObject({
      objectID: id,
      title,
      artist,
      year: parseInt(year) || new Date().getFullYear(),
      condition: condition || 'N/A',
      price: parseFloat(price) || 0,
      description: (description || '').trim(),
      imageUrl: imageUrl || 'https://via.placeholder.com/300x300/8B002B/FFFFFF?text=Capa',
      seller_id: sellerIdNum || 'anonimo', // ← agora é número
      seller_name,
      seller_phone: req.body.seller_phone || '11999999999'
    });

    res.json({ 
      message: "Disco cadastrado com sucesso!", 
      id, 
      seller_name 
    });
  } catch (err) {
    console.error("Erro ao cadastrar disco:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/sellers', async (req, res) => {
  try {
    const { name, email, phone, plan } = req.body;
    const id = Date.now().toString();

    await sellersIndex.saveObject({
      objectID: id,
      type: 'seller',
      name,
      email,
      phone,
      plan: plan || 'Starter',
      created_at: new Date().toISOString()
    });

    res.json({ message: "Vendedor cadastrado com sucesso!", id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Vinyl Collect API rodando na porta ${PORT}`);
  console.log(`✅ Correções aplicadas: seller_id como número`);
});
