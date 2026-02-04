# Quick Start Guide

## 🚀 Get Started in 3 Minutes!

### Step 1: Install MongoDB

**Already have MongoDB?** Skip to Step 2.

**Don't have MongoDB?**

- **Windows:** Download from https://www.mongodb.com/try/download/community
- **Mac:** `brew install mongodb-community`
- **Linux:** `sudo apt-get install mongodb`

Start MongoDB:
```bash
# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongodb

# Windows - MongoDB runs as a service automatically
```

### Step 2: Run the Setup Script

```bash
# Make setup script executable (Mac/Linux)
chmod +x setup.sh

# Run setup
./setup.sh
```

**Windows users:** Run these commands instead:
```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### Step 3: Seed Admin User (Optional)

```bash
cd backend
node seedAdmin.js
cd ..
```

This creates default admin:
- Phone: `admin`
- Password: `admin123`

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Open Your Browser

Go to: **http://localhost:3000**

Login with:
- Phone: `admin`
- Password: `admin123`

---

## 📱 Next Steps

1. **Change admin password** in Account Settings
2. **Add your first user** from Admin → Add User
3. **Create ledgers** for your customers
4. **Start billing!**

---

## ⚡ Common Issues

### "MongoDB connection failed"
```bash
# Check if MongoDB is running
sudo systemctl status mongodb  # Linux
brew services list             # Mac

# Start MongoDB
sudo systemctl start mongodb   # Linux
brew services start mongodb-community  # Mac
```

### "Port 3000 already in use"
```bash
# Kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9  # Mac/Linux
```

### "Port 5000 already in use"
```bash
# Kill process on port 5000
sudo lsof -ti:5000 | xargs kill -9  # Mac/Linux
```

---

## 🎯 Default Credentials

**Admin Account:**
- Phone: `admin`
- Password: `admin123`

**⚠️ Change this password immediately after login!**

---

## 📞 Need Help?

1. Check the main README.md
2. Review error messages in the terminal
3. Ensure MongoDB is running
4. Verify Node.js version (v16+)

---

**You're all set! Start managing your gold & silver shop! ✨**
