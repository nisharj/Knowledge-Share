# Setup Guide - CurioHub

## MongoDB Atlas Configuration

### Admin Credentials

- Email: `mr.mohamed9345@gmail.com`
- Password: `Nishar$006`

### Connection String

Your MongoDB Atlas connection is already configured in `backend/.env`:

```
mongodb+srv://mrmohamed9345_db_user:0U3vuIENlvFwc3lF@cluster0.e0n1byj.mongodb.net/knowledge_hub?retryWrites=true&w=majority
```

### ⚠️ IMPORTANT - If you get connection error:

**Error Example:**

```
MongoDB connection failed: querySrv ESERVFAIL
```

**SOLUTION:**

You must whitelist your IP address in MongoDB Atlas:

1. Go to [MongoDB Atlas Console](https://cloud.mongodb.com)
2. Log in with your MongoDB account
3. Select the **Cluster0** project
4. Click **Network Access** (left sidebar under SECURITY)
5. Click **Add IP Address**
6. Choose an option:
   - **Option A (Testing):** Click "Allow access from anywhere" (0.0.0.0/0)
   - **Option B (Secure):** Enter your current IP address
7. Click **Confirm**

After whitelisting, the backend can connect.

---

## Alternative: Use Local MongoDB

If MongoDB Atlas doesn't work, use your local MongoDB instance for development:

### Windows Setup

**1. Install MongoDB Community Edition**

- Download from: https://www.mongodb.com/try/download/community
- Run installer and complete setup

**2. Start MongoDB**

```powershell
mongod
```

**3. Update `backend/.env`**

```
MONGO_URI=mongodb://localhost:27017/knowledge_hub
```

**4. Start backend**

```bash
cd backend
npm run dev
```

---

## Running the Application

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

Expected output:

```
✓ MongoDB connected successfully
Server running on port 5000
```

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Visit: http://localhost:5173

### Terminal 3 - (Optional) MongoDB Compass

View your database visually:

```bash
# Download MongoDB Compass from: https://www.mongodb.com/products/compass
# Connect to: mongodb://localhost:27017 (for local)
# Or: mongodb+srv://mrmohamed9345_db_user:0U3vuIENlvFwc3lF@cluster0.e0n1byj.mongodb.net (for Atlas)
```

---

## Login to Admin Dashboard

1. Open http://localhost:5173/login
2. Email: `mr.mohamed9345@gmail.com`
3. Password: `Nishar$006`
4. Click "Login"
5. Go to Dashboard to add/edit/delete resources

---

## Troubleshooting

| Error                | Solution                                                     |
| -------------------- | ------------------------------------------------------------ |
| `querySrv ESERVFAIL` | Whitelist your IP in MongoDB Atlas Network Access            |
| `ECONNREFUSED`       | Make sure local MongoDB is running (`mongod`)                |
| Frontend shows 404   | Clear cache, restart frontend: `npm run dev`                 |
| CORS errors          | Backend CORS is configured, check API_URL in `frontend/.env` |

---

## API Quick Reference

### Public Endpoints

```
GET    /api/resources              # List all (searchable, filterable, paginated)
GET    /api/resources/:id          # Get single
GET    /api/resources/trending     # Top 5 by views
POST   /api/resources/:id/view     # Increment view count
```

### Admin Endpoints (Require JWT)

```
POST   /api/resources              # Create
PUT    /api/resources/:id          # Update
DELETE /api/resources/:id          # Delete
```

### Auth

```
POST   /api/auth/login             # Get JWT token
```

---

## File Structure

```
backend/
  ├── server.js           # Express app
  ├── .env                # Configuration (admin creds, MongoDB URI)
  ├── config/db.js        # MongoDB connection
  ├── models/
  │   ├── Resource.js
  │   └── User.js
  ├── controllers/
  │   ├── resourceController.js
  │   └── authController.js
  ├── routes/
  │   ├── resourceRoutes.js
  │   └── authRoutes.js
  └── middleware/authMiddleware.js

frontend/
  ├── index.html
  ├── vite.config.js
  ├── src/
  │   ├── main.jsx
  │   ├── App.jsx
  │   ├── pages/
  │   │   ├── Home.jsx    # Public resource discovery
  │   │   ├── Login.jsx   # Admin login
  │   │   └── Dashboard.jsx # Admin panel
  │   ├── components/
  │   │   ├── Navbar.jsx
  │   │   ├── ResourceCard.jsx
  │   │   ├── SearchBar.jsx
  │   │   └── Filter.jsx
  │   ├── context/AuthContext.jsx
  │   ├── services/api.js
  │   └── styles.css
```
