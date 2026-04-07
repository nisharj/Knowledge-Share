# Knowledge-Share

A full-stack web application for discovering and sharing curated learning resources — blogs, YouTube videos, and courses — organized by category and searchable in real time.

---

## Features

- **Browse resources** — view learning resources grouped by category with live search and filtering
- **Trending resources** — highlight the most-viewed resources
- **Admin dashboard** — protected CRUD interface for creating, editing, and deleting resources
- **JWT authentication** — secure admin-only login
- **View tracking** — each resource tracks how many times it has been opened

---

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Frontend  | React 18, Vite, React Router v6, Axios  |
| Backend   | Node.js, Express 4, Mongoose 8          |
| Database  | MongoDB                                 |
| Auth      | JSON Web Tokens (JWT), bcryptjs         |

---

## Project Structure

```
Knowledge-Share/
├── backend/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # Login + admin bootstrap
│   │   └── resourceController.js
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT protection
│   ├── models/
│   │   ├── Resource.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── resourceRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/         # Navbar, Footer, ResourceCard, …
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Login.jsx
    │   │   └── Dashboard.jsx
    │   ├── services/
    │   │   └── api.js
    │   └── App.jsx
    ├── .env.example
    ├── index.html
    └── package.json
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [MongoDB](https://www.mongodb.com/) (local or Atlas)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nisharj/Knowledge-Share.git
cd Knowledge-Share
```

### 2. Configure environment variables

**Backend** — copy and edit `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

| Variable         | Description                              | Default                                       |
| ---------------- | ---------------------------------------- | --------------------------------------------- |
| `PORT`           | Port the API server listens on           | `5000`                                        |
| `MONGO_URI`      | MongoDB connection string                | `mongodb://127.0.0.1:27017/knowledge_hub`     |
| `JWT_SECRET`     | Secret used to sign JWT tokens           | *(replace with a long random string)*         |
| `ADMIN_EMAIL`    | Email for the auto-created admin account | `admin@example.com`                           |
| `ADMIN_PASSWORD` | Password for the admin account           | `admin12345`                                  |

**Frontend** — copy and edit `frontend/.env.example`:

```bash
cp frontend/.env.example frontend/.env
```

| Variable        | Description                 | Default                        |
| --------------- | --------------------------- | ------------------------------ |
| `VITE_API_URL`  | Base URL of the backend API | `http://localhost:5000/api`    |

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Start the development servers

Open two terminal windows:

```bash
# Terminal 1 – API server (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 – Vite dev server (http://localhost:5173)
cd frontend && npm run dev
```

The first time the backend starts it automatically creates the admin account using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values from your `.env` file.

---

## Available Scripts

### Backend (`backend/`)

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start with nodemon (auto-reload)  |
| `npm start`     | Start without auto-reload         |

### Frontend (`frontend/`)

| Command           | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start Vite development server       |
| `npm run build`   | Production build to `dist/`         |
| `npm run preview` | Preview the production build locally|

---

## API Endpoints

All endpoints are prefixed with `/api`.

### Auth

| Method | Endpoint          | Description        | Auth required |
| ------ | ----------------- | ------------------ | ------------- |
| POST   | `/auth/login`     | Admin login        | No            |

### Resources

| Method | Endpoint                  | Description                    | Auth required |
| ------ | ------------------------- | ------------------------------ | ------------- |
| GET    | `/resources`              | List resources (supports `q`, `page`, `limit` query params) | No |
| GET    | `/resources/trending`     | Top resources by view count    | No            |
| GET    | `/resources/:id`          | Get a single resource          | No            |
| POST   | `/resources/:id/view`     | Increment view counter         | No            |
| POST   | `/resources`              | Create a new resource          | Admin         |
| PUT    | `/resources/:id`          | Update a resource              | Admin         |
| DELETE | `/resources/:id`          | Delete a resource              | Admin         |

### Resource fields

| Field         | Type                               | Required |
| ------------- | ---------------------------------- | -------- |
| `title`       | string                             | Yes      |
| `description` | string                             | Yes      |
| `link`        | string (URL)                       | Yes      |
| `type`        | `"blog"` \| `"youtube"` \| `"course"` | Yes   |
| `category`    | string (defaults to `"general"`)   | No       |
| `tags`        | string[] (comma-separated in UI)   | No       |

---

## Usage

1. Open `http://localhost:5173` to browse resources.
2. Navigate to `/login` and sign in with your admin credentials.
3. After login you are redirected to the **Dashboard** where you can add, edit, or delete resources.

---

## License

This project is licensed under the [MIT License](LICENSE).
