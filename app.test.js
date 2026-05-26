import request from 'supertest';
import app from './app.js';
import { sequelize } from './db/index.js';

afterAll(async () => {
  // Close the database connection so Jest doesn't hang
  await sequelize.close();
});

describe('Express ChatBot Routes', () => {
  
  describe('Database Connection', () => {
    it('should successfully test connection using SELECT 1', async () => {
      // In Sequelize, query runs raw SQL
      const [rows] = await sequelize.query('SELECT 1');
      expect(rows).toBeDefined();
      expect(rows.length).toBe(1);
    });
  });
  
  describe('GET /', () => {
    it('should return HTML page with status 200', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Verify EJS returns HTML and contains page identifiers
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Ruki Restaurant ChatBot');
      expect(response.text).toContain('Place an order');
    });
  });

  describe('POST /api/chat', () => {
    it('should return Joi validation error if message is empty', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '   ' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Message cannot be empty');
    });

    it('should process menu request and return menu selections on "1"', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.text).toContain('Ruki Restaurant Menu');
      expect(response.body.text).toContain('Double Cheeseburger');
    });
  });
  
  describe('Auth Route Access', () => {
    it('should load login page successfully', async () => {
      await request(app)
        .get('/login')
        .expect(200);
    });

    it('should load signup page successfully', async () => {
      await request(app)
        .get('/signup')
        .expect(200);
    });
  });
});