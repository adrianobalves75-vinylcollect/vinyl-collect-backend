const express = require('express');
const algoliasearch = require('algoliasearch');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Configuração do Algolia
const client = algoliasearch(
  process.env.ALGOLIA_APP_ID, 
  process.env.ALGOLIA_ADMIN_KEY
);
const index = client.initIndex('products');

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.json({ message: "Vinyl Collect API - Backend ativo!" });
});

// Busca no Algolia
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

// Busca no Discogs (sem chave, só User-Agent)
app.get('/discogs/search', async (req, res) => {
  try {
    const { q } = req.query;
    const response = await fetch(
      `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&type=release`,
      {
        headers: {
          'User-Agent': 'VinylCollectApp/1.0 +https://vinylcollect.app'
        }
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Erro Discogs:", err.message);
    res.status(500).json({ error: "Falha na busca no Discogs" });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Rota TEMPORÁRIA para testar indexação no Algolia
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

// Rota para cadastrar discos reais
app.post('/products', async (req, res) => {
  try {
    const { title, artist, year, condition, price, description } = req.body;
    
    // Salvar no banco de dados (Supabase)
    const product = await pool.query(
      `INSERT INTO products (seller_id, title, artist, year, condition, price, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['test_seller', title, artist, year, condition, price, description]
    );

    // Indexar no Algolia
    await index.saveObject({
      objectID: product.rows[0].id,
      title,
      artist,
      year,
      condition,
      price,
      description,
      seller_id: 'test_seller'
    });

    res.json({ message: "Disco cadastrado com sucesso!", id: product.rows[0].id });
  } catch (err) {
    console.error("Erro ao cadastrar:", err);
    res.status(500).json({ error: err.message });
  }
});
