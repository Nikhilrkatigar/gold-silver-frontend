# CORS Configuration & Local Development Setup

## Overview
This application is now configured to work in **both local development** and **production hosting** environments with proper CORS handling.

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 14+ installed
- MongoDB running locally or accessible:
  - **Local MongoDB**: `mongodb://localhost:27017`
  - **Remote MongoDB**: Update `MONGODB_URI` in `.env`

### Step 1: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Update .env with your settings
# - PORT=5000
# - MONGODB_URI=mongodb://localhost:27017/gold-silver-saas
# - JWT_SECRET=your-secret-key
# - NODE_ENV=development
```

### Step 2: Start Backend
```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

Backend will run on: **http://localhost:5000**

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Frontend .env is already configured for local dev
# VITE_API_URL=http://localhost:5000
```

### Step 4: Start Frontend
```bash
npm run dev
```

Frontend will run on: **http://localhost:3000** or **http://localhost:5173**

---

## ✅ Testing Locally

1. **Backend Health Check**:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Frontend Access**:
   - Open browser: `http://localhost:3000`
   - Try login - it should connect to your local backend

---

## 🌍 Production/Hosting Setup

### Backend (Render.com or similar)

1. **Environment Variables** on Render:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/gold-silver-saas
   JWT_SECRET=your-production-secret-key
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-domain.com (optional)
   ```

2. **CORS is automatically configured** for:
   - Production Vercel URLs (already in server.js)
   - Custom frontend URL (via `FRONTEND_URL` env var)
   - Localhost urls (for testing)

### Frontend (Vercel or similar)

1. **Create `.env.production`** for production builds:
   ```
   VITE_API_URL=https://gold-silver-backend-hrcq.onrender.com
   ```

2. **Deploy to Vercel**:
   - Connect GitHub repo
   - Set environment variable `VITE_API_URL`
   - Deploy

---

## 🔧 CORS Configuration Details

### What's Allowed (Backend)
- **Local Development**: `localhost:3000`, `localhost:3001`, `localhost:5173`, `127.0.0.1:*`
- **Production**: All configured Vercel URLs + env-based `FRONTEND_URL`
- **Mobile/Desktop Apps**: Requests without origin (no browser)

### What's Required
- ✅ `Content-Type` header
- ✅ `Authorization` header for protected routes
- ✅ Credentials (cookies) support enabled

---

## ❌ Common Issues & Solutions

### Issue: Still getting CORS error locally?
1. **Check backend .env**: `NODE_ENV=development`
2. **Verify frontend .env**: `VITE_API_URL=http://localhost:5000`
3. **Restart both services** after changing .env
4. **Clear browser cache** (Ctrl+Shift+Delete)

### Issue: Works locally, fails in production?
1. **Add backend URL to Vercel env vars**: Set `VITE_API_URL` to your Render backend
2. **Check Render backend logs** for CORS errors
3. **Verify MongoDB connection** in production
4. **Ensure JWT_SECRET is set** in production

### Issue: Can't login on either environment?
1. Check MongoDB connection
2. Verify `seedAdmin.js` has run to create initial admin user
3. Check API endpoint paths (should be `/api/auth/login`)
4. Check browser console for exact error message

---

## 📋 Switching Between Environments

### To switch to production URLs:
**Frontend `.env`**:
```dotenv
VITE_API_URL=https://gold-silver-backend-hrcq.onrender.com
```

### To switch back to local:
**Frontend `.env`**:
```dotenv
VITE_API_URL=http://localhost:5000
```

Then restart frontend: `npm run dev`

---

## 🔐 Security Notes
- Never commit `.env` files with real secrets
- Always use `JWT_SECRET` > 32 characters in production
- Keep `NODE_ENV=production` on hosted backends
- Use HTTPS in production (Render/Vercel provide this automatically)

---

## 📝 Git Workflow
```bash
# Development
git checkout -b feature/my-feature
# Make changes locally
# Test with `npm run dev` in both frontend & backend
# Commit and push

# Deployment
git push origin feature/my-feature
# Create Pull Request
# After merge to main, Vercel/Render auto-deploy
```

---

## ✨ You're All Set!
Your app now works seamlessly in:
- ✅ Local development
- ✅ Production on Render + Vercel
- ✅ Testing different features without conflicts

Happy coding! 🎉
