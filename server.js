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
const index = client.initIndex('products');

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

// Rota para cadastrar discos reais (com nome do vendedor)
app.post('/products', async (req, res) => {
  try {
    const { title, artist, year, condition, price, description, seller_id } = req.body;
    const id = Date.now().toString();
    
    // Busca o nome do vendedor (se seller_id for fornecido)
    let seller_name = 'Loja Vinyl Collect';
    if (seller_id) {
      try {
        const sellerSearch = await index.search('', {
          filters: `objectID:${seller_id} AND type:seller`
        });
        if (sellerSearch.hits.length > 0) {
          seller_name = sellerSearch.hits[0].name;
        }
      } catch (err) {
        console.error("Erro ao buscar vendedor:", err);
      }
    }

    await index.saveObject({
      objectID: id,
      title,
      artist,
      year,
      condition,
      price,
      description,
      seller_id,
      seller_name,
      seller_phone: req.body.seller_phone || '11999999999'
    });

    res.json({ message: "Disco cadastrado com sucesso!", id, seller_name });
  } catch (err) {
    console.error("Erro ao cadastrar:", err);
    res.status(500).json({ error: err.message });
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
      seller_id: 'test_seller',
      seller_name: 'Loja Vinyl Collect'
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

// Rota para cadastrar vendedores
app.post('/sellers', async (req, res) => {
  try {
    const { name, email, phone, plan } = req.body;
    
    // Gera um ID único
    const id = Date.now().toString();
    
    // Salva DIRETAMENTE no Algolia (sem banco)
    await index.saveObject({
      objectID: id,
      type: 'seller',
      name,
      email,
      phone,
      plan,
      created_at: new Date().toISOString()
    });

    res.json({ message: "Vendedor cadastrado com sucesso!", id });
  } catch (err) {
    console.error("Erro ao cadastrar vendedor:", err);
    res.status(500).json({ error: err.message });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
