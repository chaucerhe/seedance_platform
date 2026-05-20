require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const ARK_API_KEY = process.env.ARK_API_KEY;
const ARK_BASE_URL = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/plan/v3';

app.use(cors());
app.use(express.json({ limit: '100mb' }));

const VALID_USER = { username: 'chaucer', password: 'Welcome2didi' };

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === VALID_USER.username && password === VALID_USER.password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

const arkClient = axios.create({
  baseURL: ARK_BASE_URL,
  headers: {
    'Authorization': `Bearer ${ARK_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 300000,
});

app.post('/api/tasks', async (req, res) => {
  try {
    const response = await arkClient.post('/contents/generations/tasks', req.body);
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    res.status(status).json({ error: message });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const response = await arkClient.get(`/contents/generations/tasks/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    res.status(status).json({ error: message });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const params = {};
    if (req.query.page_token) params.page_token = req.query.page_token;
    if (req.query.page_size) params.page_size = req.query.page_size;
    if (req.query.model) params.model = req.query.model;
    if (req.query.status) params.status = req.query.status;
    const response = await arkClient.get('/contents/generations/tasks', { params });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    res.status(status).json({ error: message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const response = await arkClient.delete(`/contents/generations/tasks/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message;
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});