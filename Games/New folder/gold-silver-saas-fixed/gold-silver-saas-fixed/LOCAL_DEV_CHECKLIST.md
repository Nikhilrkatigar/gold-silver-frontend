# ✅ Local Development Checklist

## Before You Start
Make sure you have:
- [ ] Node.js installed (`node --version`)
- [ ] MongoDB running locally or accessible
- [ ] All files have been updated with CORS fixes

## Backend Setup
```bash
cd backend
npm install
```
- [ ] Check `backend/.env`:
  - `PORT=5000`
  - `MONGODB_URI=mongodb://localhost:27017/gold-silver-saas`
  - `JWT_SECRET=your-secret-key`
  - `NODE_ENV=development`
  - Example provided in `.env.example`

Start backend:
```bash
npm run dev
```
- [ ] Backend should output: `🚀 Server running` on http://localhost:5000
- [ ] Test health: `curl http://localhost:5000/api/health`

## Frontend Setup
```bash
cd frontend
npm install
```
- [ ] Check `frontend/.env`:
  ```
  VITE_API_URL=http://localhost:5000
  Environment=Development
  ```

Start frontend:
```bash
npm run dev
```
- [ ] Frontend runs on `http://localhost:3000` or `http://localhost:5173`
- [ ] Open browser and go to http://localhost:3000

## Test Login
1. [ ] Go to login page
2. [ ] Try logging in with admin credentials
3. [ ] Check browser console for CORS errors (should be NONE now ✅)
4. [ ] You should see network request succeed to `http://localhost:5000/api/auth/login`

## Success Indicators
- ☀️ No CORS errors in browser console
- ☀️ Network requests show `http://localhost:5000` in DevTools
- ☀️ Login request returns 200/401 (not blocked error)
- ☀️ Can navigate after successful login

---

## For Production (On Render/Vercel)

### Backend (Render)
- [ ] Set `NODE_ENV=production` in Render dashboard
- [ ] Set `FRONTEND_URL=https://your-vercel-url.com` (optional, for custom domains)
- [ ] MongoDB URI points to Atlas (cloud)
- [ ] Verify backend at `https://gold-silver-backend-hrcq.onrender.com/api/health`

### Frontend (Vercel)
- [ ] Set `VITE_API_URL=https://gold-silver-backend-hrcq.onrender.com`
- [ ] Deploy app - Vercel will auto-build with this env var
- [ ] Test login on production URL

---

## Quick Restart Guide
If something breaks or you changed .env:
```bash
# Backend
cd backend && npm run dev

# Frontend (new terminal)
cd frontend && npm run dev

# Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

---

## Need More Help?
See `CORS_SETUP_GUIDE.md` for detailed explanation of all changes.
