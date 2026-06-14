# 🛍️ Moda — AI-Powered Clothing Store

> A full-stack e-commerce platform for fashion retail, featuring an AI chatbot assistant, Elasticsearch-powered product search, virtual try-on, and outfit builder — built as a graduation project at Cumhuriyet University.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [AI Features](#ai-features)
- [Database Models](#database-models)
- [Running Tests](#running-tests)

---

## Overview

**Moda** is a modern, AI-enhanced e-commerce clothing store web application. It combines a FastAPI backend with a React (Vite) frontend, PostgreSQL for persistent data, and Elasticsearch for fast, intelligent product search. The platform integrates Google Gemini AI to power a multilingual shopping assistant, AI outfit generation, and virtual try-on experiences.

---

## ✨ Features

### 🛒 Core E-Commerce
- User authentication (JWT-based register/login)
- Product catalog with variants (color, size, stock)
- Shopping cart and order management
- Coupon / discount code system
- Address book management
- Order tracking with shipping status
- Product reviews and ratings
- Favorites / wishlist

### 🤖 AI-Powered Features
- **Moda Assistant** — Multilingual AI chatbot (English, Turkish, Arabic) powered by Google Gemini
  - Product search and recommendations
  - Order tracking queries
  - Coupon code lookups
  - Saved address queries
- **AI Outfit Builder** — Save and manage custom clothing outfits by category slot (top, bottom, shoes, etc.)
- **Virtual Try-On** — AI-generated preview of how products look on a user
- **AI Outfit Preview** — Generate full-body outfit images using Gemini's image generation

### 🔍 Smart Search
- Elasticsearch-backed product indexing (auto-synced at startup)
- PostgreSQL ILIKE fallback for offline/dev environments
- Multilingual color detection (English, Turkish, Arabic aliases)
- Context-aware multi-turn search using conversation history

### 🎨 Frontend UX
- Responsive React SPA with React Router
- Framer Motion animations
- Tailwind CSS styling
- Admin and customer-facing dashboards
- Product image gallery with variant switching

---

## 🧰 Tech Stack

| Layer          | Technology                                      |
|----------------|-------------------------------------------------|
| **Frontend**   | React 18, Vite, Tailwind CSS v4, React Router v6, Framer Motion |
| **Backend**    | FastAPI, SQLAlchemy, Alembic, Uvicorn, Pydantic |
| **Database**   | PostgreSQL (via psycopg2)                       |
| **Search**     | Elasticsearch 8.13 (Docker)                     |
| **AI**         | Google Gemini API (`gemini-2.5-flash`, image generation) |
| **Storage**    | Cloudinary (AI-generated images)               |
| **Auth**       | JWT (python-jose), bcrypt (passlib)             |
| **Image Processing** | Pillow                                    |

---

## 📁 Project Structure

```
Code/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # Settings & env vars
│   │   │   ├── search.py          # Elasticsearch client & indexing
│   │   │   ├── security.py        # JWT utilities
│   │   │   └── cloud_storage.py   # Cloudinary upload helper
│   │   ├── models/                # SQLAlchemy ORM models
│   │   │   ├── product.py
│   │   │   ├── product_variant.py
│   │   │   ├── user.py
│   │   │   ├── order.py
│   │   │   ├── outfit.py
│   │   │   ├── cart.py
│   │   │   ├── coupon.py
│   │   │   ├── review.py
│   │   │   ├── address.py
│   │   │   ├── shipping.py
│   │   │   ├── conversation.py
│   │   │   └── ...
│   │   ├── routers/               # FastAPI route handlers
│   │   │   ├── ai.py              # AI chatbot, try-on, outfit generation
│   │   │   ├── auth.py
│   │   │   ├── products.py
│   │   │   ├── cart.py
│   │   │   ├── orders.py
│   │   │   ├── outfits.py
│   │   │   ├── coupons.py
│   │   │   ├── reviews.py
│   │   │   ├── shipping.py
│   │   │   ├── conversations.py
│   │   │   └── ...
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   ├── database.py            # DB engine & session setup
│   │   ├── dependencies.py        # Auth & DB dependency injection
│   │   └── main.py                # App entrypoint, lifespan, CORS
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # API client functions
│   │   ├── components/            # Reusable UI components
│   │   ├── context/               # React Context (global state)
│   │   ├── pages/
│   │   │   ├── admin/             # Admin dashboard pages
│   │   │   ├── auth/              # Login / Register
│   │   │   └── customer/          # Shop, product detail, cart, etc.
│   │   ├── styles/                # Global CSS
│   │   ├── utils/                 # Helper utilities
│   │   ├── App.jsx                # Root component with routing
│   │   └── main.jsx               # Vite entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml             # Elasticsearch service
├── run_app.sh                     # One-command startup script
└── .gitignore
```

---

## ✅ Prerequisites

Make sure the following are installed on your system:

- **Node.js** v18+ and **npm**
- **Python** 3.10+
- **Docker** and **Docker Compose**
- **PostgreSQL** running locally (or via a connection string)
- A **Google Gemini API key** (for AI features)
- A **Cloudinary account** (for AI image uploads)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "Bitirme proje/Code"
```

### 2. Configure Environment Variables

See the [Environment Variables](#environment-variables) section below and fill in both `.env` files.

### 3. Set Up the Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Apply database migrations:
```bash
alembic upgrade head
```

### 4. Set Up the Frontend

```bash
cd ../frontend
npm install
```

### 5. Start Everything (One Command)

From the project root:
```bash
chmod +x run_app.sh
./run_app.sh
```

This will:
1. Start **Elasticsearch** via Docker Compose
2. Start the **FastAPI backend** on `http://localhost:8000`
3. Start the **React frontend** (Vite) on `http://localhost:5173`

Press `Ctrl+C` to gracefully stop all services.

---

## 🔐 Environment Variables

### `backend/.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/moda_db
SECRET_KEY=your_jwt_secret_key
VITE_GEMINI_API_KEY=your_google_gemini_api_key

# Cloudinary (for AI image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## 📡 API Reference

The API is documented automatically at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoint Groups

| Prefix            | Description                              |
|-------------------|------------------------------------------|
| `POST /api/auth`  | Register, login, token refresh           |
| `GET/POST /api/products` | Product catalog CRUD             |
| `GET/POST /api/cart`     | Cart management                  |
| `GET/POST /api/orders`   | Order placement and tracking     |
| `GET/POST /api/outfits`  | Outfit builder (save/load)       |
| `GET/POST /api/coupons`  | Coupon validation and listing    |
| `GET/POST /api/reviews`  | Product reviews                  |
| `GET/POST /api/addresses`| User address book                |
| `POST /api/ai/chat`      | AI assistant chatbot             |
| `POST /api/ai/try-on`    | Virtual try-on image generation  |
| `POST /api/ai/generate-outfit-image` | Outfit preview image |

---

## 🤖 AI Features

### Moda Assistant (Chatbot)

The chatbot at `/api/ai/chat` uses a multi-step pipeline:

1. **Intent Detection** — Classifies the message as product, order, coupon, or address query
2. **Search** — Runs Elasticsearch (or PostgreSQL fallback) to retrieve relevant products
3. **Context Building** — Injects user info, products, orders, and coupons into the Gemini prompt
4. **Response Generation** — Google Gemini generates a natural-language reply in the user's language

**Supported languages**: English 🇬🇧, Turkish 🇹🇷, Arabic 🇸🇦

**Color detection** supports multilingual color names — e.g., `mavi` (TR), `أزرق` (AR), and `blue` (EN) all resolve to the same search filter.

### Elasticsearch Indexing

On startup, the backend:
- Drops and recreates the `products` index
- Bulk-indexes all `active` products with fields: `name`, `description`, `category`, `price`, `status`, `department`, `outfit_slot`
- Falls back to PostgreSQL ILIKE queries if Elasticsearch is unavailable

---

## 🗄️ Database Models

| Model            | Description                                   |
|------------------|-----------------------------------------------|
| `User`           | Customer accounts                             |
| `Product`        | Product catalog with department & piece type  |
| `ProductVariant` | Color/size variants with stock and images     |
| `Order`          | Customer orders with status and payment info  |
| `OrderItem`      | Line items within an order                    |
| `Cart`           | Shopping cart entries                         |
| `Outfit`         | Saved outfit configurations                   |
| `OutfitProduct`  | Products linked to an outfit with slot info   |
| `Coupon`         | Discount codes with validity rules            |
| `Review`         | Product ratings and comments                  |
| `Address`        | Saved shipping addresses                      |
| `Shipping`       | Shipping records with tracking numbers        |
| `Conversation`   | Stored chat conversation history              |
| `Category`       | Product category taxonomy                     |

---

## 🧪 Running Tests

Test scripts are available in the `backend/` directory:

```bash
cd backend
source venv/bin/activate

# Test AI product search
python3 test_product_search.py

# Test multilingual chatbot
python3 test_multilang_chat.py

# Test Gemini image generation
python3 test_imagen.py
```

---

## 📄 License

See [LICENSE](frontend/LICENSE) for details.

---

> Built with ❤️ as a graduation project — Cumhuriyet University, 2026.
