# 🛍️ Moda — AI-Powered Clothing Store

A full-stack e-commerce platform for clothing with deeply integrated AI features: a Gemini-powered chatbot, virtual try-on, AI outfit builder, and semantic product search via Elasticsearch.

---

## ✨ Features

### 🛒 Core E-Commerce
| Feature | Details |
|---|---|
| **Product Catalog** | Browse products by category, color, size, and price range |
| **Product Variants** | Full color/size variant support with per-variant stock tracking |
| **Shopping Cart** | Persistent cart with quantity management |
| **Checkout & Orders** | Multi-step checkout with address selection and order tracking |
| **Invoices** | Downloadable invoice page per order |
| **Favorites** | Save and manage wishlist items |
| **Reviews** | Star ratings and written reviews per product |
| **Coupons** | Discount code support at checkout |
| **Shipping** | Shipping options and rate management |

### 🤖 AI Features
| Feature | Details |
|---|---|
| **AI Chatbot** | Gemini-powered conversational assistant for product discovery and recommendations |
| **Virtual Try-On** | AI-generated try-on visualization using uploaded user photos |
| **Outfit Builder** | Drag-and-drop outfit composer with AI-generated suggestions |
| **Outfit Gallery** | Community outfit sharing and browsing |
| **Semantic Search** | Elasticsearch-backed intelligent product search |

### 🔐 Authentication & Users
- JWT-based authentication (register / login / protected routes)
- Role-based access: **Customer** and **Admin**
- User profile management

### 🛠️ Admin Dashboard
- Full product & variant CRUD (with Cloudinary image upload)
- Category management
- Order management & status updates
- Coupon management
- Shipping configuration
- Homepage content management

---

## 🏗️ Tech Stack

### Backend
| Layer | Technology |
|---|---|
| **Runtime** | Python 3.11+ |
| **Framework** | FastAPI 0.129 |
| **ORM** | SQLAlchemy 2.0 + Alembic (migrations) |
| **Database** | PostgreSQL (via `psycopg2-binary`) |
| **Search** | Elasticsearch 8.13 |
| **AI** | Google Gemini (`google-generativeai`) |
| **Image Hosting** | Cloudinary |
| **Auth** | JWT via `python-jose` + `passlib` (bcrypt) |
| **Server** | Uvicorn (ASGI) |

### Frontend
| Layer | Technology |
|---|---|
| **Framework** | React 18 + Vite 6 |
| **Styling** | Tailwind CSS v4 |
| **Routing** | React Router DOM v6 |
| **Animations** | Motion (Framer Motion) |
| **Icons** | Lucide React |
| **AI (client-side)** | `@google/generative-ai` SDK |

### Infrastructure
| Service | Details |
|---|---|
| **Elasticsearch** | Runs via Docker Compose |
| **PostgreSQL** | External (configure via `DATABASE_URL`) |
| **Cloudinary** | Cloud image storage for product images and try-on |

---

## 📁 Project Structure

```
clothing_store_V2_AI/
├── docker-compose.yml          # Starts Elasticsearch
├── run_app.sh                  # One-command startup script
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app entry point + CORS
│       ├── database.py         # SQLAlchemy engine & session
│       ├── dependencies.py     # Auth dependency injection
│       ├── core/
│       │   ├── config.py       # Settings (env vars via pydantic-settings)
│       │   ├── security.py     # Password hashing, JWT utils
│       │   ├── search.py       # Elasticsearch client + indexing logic
│       │   └── cloud_storage.py # Cloudinary upload helpers
│       ├── models/             # SQLAlchemy ORM models
│       │   ├── user.py
│       │   ├── product.py
│       │   ├── product_variant.py
│       │   ├── category.py
│       │   ├── cart.py
│       │   ├── order.py
│       │   ├── address.py
│       │   ├── favorite.py
│       │   ├── review.py
│       │   ├── coupon.py
│       │   ├── outfit.py
│       │   ├── invoice.py
│       │   ├── shipping.py
│       │   └── conversation.py
│       ├── schemas/            # Pydantic request/response schemas
│       └── routers/            # API route handlers
│           ├── auth.py
│           ├── products.py
│           ├── variants.py
│           ├── categories.py
│           ├── cart.py
│           ├── orders.py
│           ├── addresses.py
│           ├── favorites.py
│           ├── reviews.py
│           ├── coupons.py
│           ├── outfits.py
│           ├── shipping.py
│           ├── conversations.py
│           └── ai.py           # AI chatbot, try-on, outfit generation
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Root component + routing
        ├── main.jsx
        ├── api/                # Axios API client modules
        │   ├── client.js       # Axios instance + interceptors
        │   ├── products.js
        │   └── outfits.js
        ├── context/            # React Context providers
        │   ├── AppContext.jsx   # Global app state
        │   ├── AuthContext.jsx  # Auth state & token management
        │   ├── CartContext.jsx  # Cart state & actions
        │   └── ThemeContext.jsx
        ├── components/
        │   ├── layout/
        │   │   ├── Header.jsx
        │   │   ├── Footer.jsx
        │   │   └── AdminLayout.jsx
        │   └── ui/
        │       ├── FloatingChat.jsx     # AI chatbot widget
        │       ├── TryOnModal.jsx       # Virtual try-on UI
        │       ├── OutfitCard.jsx
        │       ├── CommunityOutfitCard.jsx
        │       ├── ProductCard.jsx
        │       ├── Carousel.jsx
        │       ├── Toast.jsx
        │       └── TextPressure.jsx     # Animated heading component
        ├── pages/
        │   ├── auth/
        │   │   ├── LoginPage.jsx
        │   │   └── RegisterPage.jsx
        │   ├── customer/
        │   │   ├── HomePage.jsx
        │   │   ├── CatalogPage.jsx
        │   │   ├── ProductDetailPage.jsx
        │   │   ├── CartPage.jsx
        │   │   ├── CheckoutPage.jsx
        │   │   ├── OrdersPage.jsx
        │   │   ├── OrderDetailPage.jsx
        │   │   ├── InvoicePage.jsx
        │   │   ├── FavoritesPage.jsx
        │   │   ├── ProfilePage.jsx
        │   │   ├── OutfitBuilderPage.jsx
        │   │   ├── OutfitGalleryPage.jsx
        │   │   └── ChatbotPage.jsx
        │   └── admin/
        │       ├── AdminDashboard.jsx
        │       ├── AdminProductsPage.jsx
        │       ├── AdminCategoriesPage.jsx
        │       ├── AdminOrdersPage.jsx
        │       ├── AdminOrderDetailPage.jsx
        │       ├── AdminCouponsPage.jsx
        │       ├── AdminShippingPage.jsx
        │       └── AdminHomepagePage.jsx
        ├── utils/
        │   └── geminiService.js  # Client-side Gemini API wrapper
        └── styles/
            └── index.css
```

---

## ⚙️ Environment Variables

### Backend — `backend/.env`
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/moda_db

# JWT
SECRET_KEY=your-super-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Cloudinary (image hosting)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Frontend — `frontend/.env`
```env
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> **Note:** Both the backend and frontend use the Gemini API key. The backend uses it server-side for outfit generation and advanced AI tasks; the frontend uses the client-side SDK for the chatbot widget.

---

## 🚀 Getting Started

### Prerequisites
- **Python** 3.11+
- **Node.js** 18+ and npm
- **Docker** and **Docker Compose** (for Elasticsearch)
- **PostgreSQL** instance (local or remote)
- **Cloudinary** account — [cloudinary.com](https://cloudinary.com)
- **Google Gemini API key** — [aistudio.google.com](https://aistudio.google.com)

---

### 1. Clone the repository
```bash
git clone https://github.com/khudhur-saeed/-clothing_store_V2_AI.git
cd -clothing_store_V2_AI
```

### 2. Configure environment variables
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend
echo "VITE_GEMINI_API_KEY=your-gemini-api-key" > frontend/.env
```

### 3. Set up the backend
```bash
cd backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

cd ..
```

### 4. Set up the frontend
```bash
cd frontend
npm install
cd ..
```

### 5. Start all services (recommended)
```bash
# Make the script executable (first time only)
chmod +x run_app.sh

# Start Elasticsearch, backend, and frontend in one command
./run_app.sh
```

This script:
1. Starts **Elasticsearch** via Docker Compose on port `9200`
2. Starts the **FastAPI backend** on `http://localhost:8000`
3. Starts the **React frontend (Vite)** on `http://localhost:5173`

Press `Ctrl+C` to stop all services gracefully.

---

### Manual startup (alternative)

```bash
# Terminal 1 – Elasticsearch
docker compose up -d

# Terminal 2 – Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 3 – Frontend
cd frontend
npm run dev
```

---

## 📡 API Overview

| Endpoint | Description |
|---|---|
| `POST /auth/register` | Register a new user |
| `POST /auth/login` | Login and receive JWT token |
| `GET /products` | List/search products |
| `GET /products/{id}` | Get product details |
| `POST /products` | Create product *(admin)* |
| `GET /categories` | List categories |
| `GET /cart` | Get current user's cart |
| `POST /cart` | Add item to cart |
| `GET /orders` | List user orders |
| `POST /orders` | Place a new order |
| `GET /favorites` | Get user favorites |
| `POST /favorites` | Add to favorites |
| `POST /reviews` | Submit a product review |
| `GET /coupons` | List coupons *(admin)* |
| `POST /ai/chat` | AI chatbot endpoint |
| `POST /ai/try-on` | Virtual try-on generation |
| `GET /outfits` | List community outfits |
| `POST /outfits` | Save an outfit |
| `GET /shipping` | Get shipping options |
| `GET /conversations` | Get chat history |

> Full interactive docs available at **`http://localhost:8000/docs`** (Swagger UI) when running.

---

## 🎨 Key Design Decisions

- **FastAPI + SQLAlchemy**: Async-capable, type-safe backend with automatic OpenAPI docs generation.
- **Alembic migrations**: Schema versioning for safe database evolution.
- **Elasticsearch for search**: Semantic and full-text product search decoupled from the primary DB.
- **Cloudinary for images**: Scalable cloud storage for product images and AI try-on results — no local disk management.
- **Gemini AI (dual usage)**: Used server-side for compute-intensive outfit generation, and client-side for low-latency chat.
- **React Context (no Redux)**: Lightweight global state via `AppContext`, `AuthContext`, and `CartContext`.
- **Docker Compose for Elasticsearch only**: Keeps infrastructure simple — only Elasticsearch is containerized; the backend and frontend run natively for fast development iteration.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

See [frontend/LICENSE](frontend/LICENSE) for details.

---

*Built with ❤️ - Moda AI Clothing Store*
