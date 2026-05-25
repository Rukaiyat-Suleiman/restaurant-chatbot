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

* **Generate Migration Files**: Compiles Drizzle JS schemas into versioned SQL files:
  ```bash
  npm run db:generate
  ```
* **Run Programmatic Migrations**: Executes pending SQL migrations directly on your PostgreSQL database:
  ```bash
  npm run db:migrate
  ```
* **Wipe Database Tables**: Cascade drops all chatbot tables in the database to allow a fresh migration sync:
  ```bash
  npm run db:drop
  ```
* **Push Schema Directly**: Prototyping shortcut to push schema modifications without making files:
  ```bash
  npm run db:push
  ```
* **Seed Test Data**: Seeds a persistent administrator test account:
  ```bash
  npm run db:seed
  ```
  *(Seeded credentials: **`admin@example.com`** / **`admin123`**)*

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
