const express = require('express');
const algoliasearch = require('algoliasearch'); // ← Biblioteca do Algolia
require('dotenv').config(); // ← Carrega variáveis do .env

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

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
// Rota TEMPORÁRIA para forçar indexação no Algolia
app.get('/force-index', async (req, res) => {
  try {
    const testProduct = {
      id: 'forced_123',
      title: 'Dark Side of the Moon',
      artist: 'Pink Floyd',
      year: 1973,
      condition: 'Mint',
      price: 200.00,
      description: 'Edição original UK',
      seller_id: 'forced_seller'
    };
    
    await index.saveObject({
      objectID: testProduct.id,
      ...testProduct
    });
    
    res.json({ message: "Produto forçado indexado!" });
  } catch (err) {
    console.error("Erro ao indexar:", err);
    res.status(500).json({ error: err.message });
  }
});
