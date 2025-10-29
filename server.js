const express = require('express');
const algoliasearch = require('algoliasearch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Algolia
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID, 
  process.env.ALGOLIA_ADMIN_KEY
);
const index = client.initIndex('products');

// Rota principal
app.get('/', (req, res) => {
  res.json({ message: "Vinyl Collect API - Backend ativo!" });
});

// Rota de busca (Algolia)
app.get('/search', async (req, res) => {
  try {
    const { q = '', page = 0, hitsPerPage = 20 } = req.query;
    const response = await index.search(q, {
      page: parseInt(page),
      hitsPerPage: parseInt(hitsPerPage)
    });
    res.json(response);
  } catch (err) {
    console.error("Erro na busca:", err);
    res.status(500).json({ error: "Falha na busca" });
  }
});

// Rota TEMPORÁRIA para testar indexação
app.post('/test-index', async (req, res) => {
  try {
    const testProduct = {
      id: 'test_123',
      title: 'Abbey Road',
      artist: 'The Beatles',
      year: 1969,
      condition: 'Mint',
      price: 150.00,
      description: 'Edição original UK',
      seller_id: 'test_seller'
    };
    
    await index.saveObject({
      objectID: testProduct.id,
      ...testProduct
    });
    
    res.json({ message: "Produto de teste indexado!", product: testProduct });
  } catch (err) {
    console.error("Erro ao indexar:", err);
    res.status(500).json({ error: err.message });
  }
});

// Busca pública no Discogs (NÃO precisa de autenticação)

app.get('/discogs/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await fetch(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=release&key=${process.env.DISCOGS_CONSUMER_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Erro na busca Discogs:", err);
    res.status(500).json({ error: "Falha na busca no Discogs" });
  }
});
