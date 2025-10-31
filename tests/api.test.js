const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const express = require('express');
const path = require('path');

// Import the createNotFoundHandler
const { createNotFoundHandler } = require('../notFoundHandler');

describe('API 端点测试', () => {
  let app;

  test('404处理应该正确区分API和普通路由', async () => {
    app = express();
    app.use(express.json());
    
    app.get('/api/existing', (req, res) => {
      res.json({ success: true });
    });
    
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    app.use(createNotFoundHandler(indexPath));
    
    // Test that non-existent API endpoints return JSON
    const apiResponse = await request(app)
      .get('/api/nonexistent')
      .expect(404);
    
    assert.strictEqual(apiResponse.body.success, false);
    assert.strictEqual(apiResponse.body.message, '未找到资源');
    assert.strictEqual(apiResponse.headers['content-type'], 'application/json; charset=utf-8');
    
    // Test that existing API works
    const existingResponse = await request(app)
      .get('/api/existing')
      .expect(200);
    
    assert.strictEqual(existingResponse.body.success, true);
  });

  test('非API路由GET请求应该返回HTML', async () => {
    app = express();
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    app.use(createNotFoundHandler(indexPath));
    
    const response = await request(app)
      .get('/some-page')
      .expect(200);
    
    assert(response.text.includes('<!DOCTYPE html>'));
  });

  test('非GET非API请求应该返回404 JSON', async () => {
    app = express();
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    app.use(createNotFoundHandler(indexPath));
    
    const response = await request(app)
      .post('/some-page')
      .expect(404);
    
    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.message, '未找到资源');
  });
});
