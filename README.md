# Restaurant ChatBot

A premium, minimalist chatbot built with Node.js, Express, EJS, Drizzle ORM (PostgreSQL), and Paystack payment integration.

---

## 🛠️ Technology Stack
- **Backend**: Express, Drizzle ORM, Joi, Bcrypt, native `fetch`
- **Database**: PostgreSQL (`pg` pool client)
- **Frontend**: EJS templates, ultra-minimalist dark mode CSS (Inter font, zinc colors, no heavy emojis/side-borders)
- **Payment**: Paystack test gateway
- **Tests**: Jest and Supertest

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/Rukaiyat-Suleiman/restaurant-chatbot-api.git
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables (`.env`)
Copy `.env.example` to `.env` file in the project root and update the following variables:
```bash
cp .env.example .env
```

```env
PORT=2000
PAYSTACK_KEY=your_paystack_secret_test_key
DATABASE_URL=postgresql://your_db_user:your_db_password@localhost:5432/your_db_name
```

### 4. Setup & Sync the Database
We have added convenient database scripts inside `package.json` to manage your tables:

* **Synchronize Database**: Connects to your PostgreSQL database and automatically syncs the tables (creates them if missing, alters them if columns change) flatly inside your `public` schema without any schema-creation restrictions:
  ```bash
  npm run db:migrate
  ```
* **Seed Test Data**: Seeds a persistent administrator test account:
  ```bash
  npm run db:seed
  ```
  *(Seeded credentials: **`admin@example.com`** / **`admin123`**)*

* **Wipe Database Tables**: Cascading drops all chatbot tables to start fresh:
  ```bash
  npm run db:drop
  ```

---

## Running the Application

### Start Development Server
```bash
npm run dev
```
Open your browser to `http://localhost:2000` to start chatting!

*A copyable floating side panel is rendered in guest chat to let you easily copy test login details.*

---

## 🧪 Running Automated Tests
Run integration test suites verifying chatbot page renders, Joi validations, database pool connectivity, and auth flows:
```bash
npm test
```
