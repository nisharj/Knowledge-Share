# Quick Start Checklist ✓

## ✅ Pre-Run: MongoDB Atlas Setup (CRITICAL)

Before starting the backend, you MUST whitelist your IP address:

1. Go to https://cloud.mongodb.com
2. Log in > Select Cluster0
3. Network Access > Add IP Address
4. Choose one:
   - ☐ "Allow access from anywhere" (easiest for testing)
   - ☐ Enter your specific IP address (more secure)
5. Confirm

**Why?** Without this, you'll get: `MongoDB connection failed: querySrv ESERVFAIL`

---

## ✅ Verified Components

- ✓ Backend routes fixed (proper ordering)
- ✓ Error handling improved
- ✓ Admin bootstrap error-safe
- ✓ MongoDB connection diagnostics added
- ✓ Frontend builds clean
- ✓ `.env` files created with your credentials
- ✓ Dependencies installed

---

## 🚀 Running the Application

### Terminal 1: Start Backend

```bash
cd backend
npm run dev
```

**Expected output:**

```
✓ MongoDB connected successfully
Server running on port 5000
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

**Opens:** http://localhost:5173

### Terminal 3: (Optional) View Database

Download MongoDB Compass: https://www.mongodb.com/products/compass

Connect to:

- Atlas: `mongodb+srv://mrmohamed9345_db_user:0U3vuIENlvFwc3lF@cluster0.e0n1byj.mongodb.net`
- Local: `mongodb://localhost:27017`

---

## 🔐 Admin Login

| Field    | Value                    |
| -------- | ------------------------ |
| Email    | mr.mohamed9345@gmail.com |
| Password | Nishar$006               |

After login → Go to Dashboard → Add/Edit/Delete Resources

---

## 🔧 Configuration

### Backend (`.env` - Already Set)

- MongoDB Atlas credentials configured
- Admin email: `mr.mohamed9345@gmail.com`
- Admin password: `Nishar$006`
- JWT secret: configured

### Frontend (`.env` - Already Set)

- API URL: `http://localhost:5000/api`

---

## ⚠️ Common Issues & Fixes

| Issue                        | Solution                                                    |
| ---------------------------- | ----------------------------------------------------------- |
| `querySrv ESERVFAIL`         | Whitelist IP in MongoDB Atlas Network Access                |
| `ECONNREFUSED`               | Make sure backend is running on port 5000                   |
| Frontend can't reach backend | Check API_URL in `frontend/.env` matches backend port       |
| 404 when clicking resources  | Make sure `/trending` route works (should be before `/:id`) |
| Admin login fails            | Verify ADMIN_EMAIL and ADMIN_PASSWORD in `backend/.env`     |

---

## 📚 Documentation

- [ISSUES_FIXED.md](./ISSUES_FIXED.md) - Details on what was fixed
- [SETUP.md](./SETUP.md) - Complete setup guide with MongoDB help
- [README.md](./README.md) - Project overview and API reference

---

## ✨ What You Can Do Now

### Public Features (No Login Needed)

- ✅ View all resources
- ✅ Search by title/tags/description
- ✅ Filter by type (Blog/YouTube/Course)
- ✅ Filter by tags
- ✅ Paginate through resources
- ✅ Open resource links
- ✅ Copy resource links
- ✅ View count tracking

### Admin Features (After Login)

- ✅ Add new resources
- ✅ Edit existing resources
- ✅ Delete resources
- ✅ View analytics (total resources, total views)

### Coming Next (Advanced Features)

- ⏳ Bookmark system
- ⏳ Dark/light mode
- ⏳ Smart recommendations
- ⏳ Admin analytics dashboard

---

## 🎉 You're Ready!

1. Whitelist your IP in MongoDB Atlas
2. Run backend: `npm run dev` (in `backend/` folder)
3. Run frontend: `npm run dev` (in `frontend/` folder)
4. Open http://localhost:5173
5. Login with the credentials above
6. Start adding resources!

**Questions?** Check [ISSUES_FIXED.md](./ISSUES_FIXED.md) and [SETUP.md](./SETUP.md)
