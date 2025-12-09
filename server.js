const express = require('express');
const algoliasearch = require('algoliasearch');
require('dotenv').config();

const app = express();
app.use(express.json());

// Habilita CORS para todas as origens (necessário para app mobile)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const PORT = process.env.PORT || 3000;

// Configuração do Algolia
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID, 
  process.env.ALGOLIA_ADMIN_KEY
);
const productsIndex = client.initIndex('products');
const sellersIndex = client.initIndex('sellers'); // ← índice separado (já existe!)

// Rota principal
app.get('/', (req, res) => {
  res.json({ message: "Vinyl Collect API - Backend ativo!" });
});

// Busca no Algolia (só em produtos)
app.get('/search', async (req, res) => {
  try {
    const { q = '', page = 0, hitsPerPage = 20 } = req.query;
    const response = await productsIndex.search(q, {
      page: parseInt(page),
      hitsPerPage: parseInt(hitsPerPage)
    });
    res.json(response);
  } catch (err) {
    console.error("Erro na busca:", err);
    res.status(500).json({ error: "Falha na busca" });
  }
});

// Rota para cadastrar discos reais (com nome do vendedor)
app.post('/products', async (req, res) => {
  try {
    const { title, artist, year, condition, price, description, seller_id } = req.body;
    const id = Date.now().toString();

    // ✅ CORREÇÃO PRINCIPAL: Busca o nome do vendedor no índice `sellers` (não `products`)
    let seller_name = 'Loja Vinyl Collect'; // fallback
    if (seller_id) {
      try {
        // Usa getObject (não search) — mais rápido e direto para ID único
        const seller = await sellersIndex.getObject(seller_id);
        seller_name = seller.name || seller_name;
      } catch (err) {
        // Não falha se o vendedor não for encontrado — usa fallback
        console.warn(`seller_id '${seller_id}' não encontrado no índice 'sellers'`);
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
      seller_id: seller_id || 'anonimo',
      seller_name,
      seller_phone: req.body.seller_phone || '11999999999'
    });

    res.json({ 
      message: "Disco cadastrado com sucesso!", 
      id, 
      seller_name,
      seller_id_used: seller_id // para debug
    });
  } catch (err) {
    console.error("Erro ao cadastrar disco:", err);
    res.status(500).json({ error: err.message });
  }
});

// Rota para cadastrar vendedores (no índice `sellers`)
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
    console.error("Erro ao cadastrar vendedor:", err);
    res.status(500).json({ error: err.message });
  }
});

    res.json({ message: "Vendedor cadastrado com sucesso!", id, name });
  } catch (err) {
    console.error("Erro ao cadastrar vendedor:", err);
    res.status(500).json({ error: err.message });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
