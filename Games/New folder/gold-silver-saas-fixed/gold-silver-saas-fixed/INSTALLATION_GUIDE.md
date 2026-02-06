# Gold & Silver Shop SaaS - Installation Guide

## Table of Contents
1. System Requirements
2. Installation Steps
3. First-Time Setup
4. Admin Panel Guide
5. User Panel Guide
6. Troubleshooting

---

## 1. System Requirements

### Minimum Requirements
- **Operating System:** Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **Node.js:** Version 16.0 or higher
- **MongoDB:** Version 5.0 or higher
- **RAM:** 4GB minimum
- **Disk Space:** 500MB free space
- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Recommended Requirements
- **RAM:** 8GB or more
- **Disk Space:** 2GB free space
- **Internet:** For initial package downloads

---

## 2. Installation Steps

### A. Install Prerequisites

#### Installing Node.js

**Windows:**
1. Download from https://nodejs.org/
2. Run the installer
3. Verify installation: Open Command Prompt and run `node --version`

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org/
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm
```

#### Installing MongoDB

**Windows:**
1. Download from https://www.mongodb.com/try/download/community
2. Run the installer
3. MongoDB will run as a Windows service automatically

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### B. Extract and Setup Application

1. **Extract the ZIP file:**
   ```bash
   unzip gold-silver-saas.zip
   cd gold-silver-saas
   ```

2. **Run the automated setup:**
   ```bash
   chmod +x setup.sh  # Mac/Linux only
   ./setup.sh
   ```
   
   **Windows users:** Open Command Prompt or PowerShell and run:
   ```bash
   cd backend
   npm install
   cd ..\frontend
   npm install
   cd ..
   ```

3. **Seed the admin user:**
   ```bash
   cd backend
   npm run seed
   cd ..
   ```

### C. Start the Application

1. **Start Backend** (in one terminal):
   ```bash
   cd backend
   npm start
   ```
   
   You should see:
   ```
   ✅ Connected to MongoDB
   🚀 Server running on port 5000
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   
   You should see:
   ```
   ➜  Local:   http://localhost:3000/
   ```

3. **Open your browser:**
   Navigate to: http://localhost:3000

---

## 3. First-Time Setup

### Login as Admin

1. Open http://localhost:3000
2. Enter credentials:
   - Phone: `admin`
   - Password: `admin123`
3. Click "Sign In"

### Change Admin Password

⚠️ **Important:** Change the default password immediately!

1. Go to Account Settings
2. Update your phone number and shop name
3. Change the password

### Add Your First User

1. Navigate to **Admin → Add User**
2. Fill in the form:
   - Shop Name: Enter the shop name
   - Phone Number: User's phone number
   - Password: Set a password for the user
   - License Duration: Enter number of days (e.g., 30, 90, 365)
3. Click "Create User"

---

## 4. Admin Panel Guide

### Dashboard
- View total users, active users, expired users
- Monitor expiring licenses

### Add User
- Create new shop accounts
- Set license duration
- Assign credentials

### User List
- View all registered shops
- Edit shop details
- Extend license periods
- Delete shops (warning: deletes all data)

### Expiring Soon
- Monitor shops with licenses expiring in 7 days
- Take action before expiry

---

## 5. User Panel Guide

### Dashboard (Credit Bills Due)
- View customers with payments due today
- Monitor outstanding balances
- Track gold and silver weights

### Billing
1. Select customer from dropdown
2. Enter gold/silver rates
3. Add items (gold or silver)
4. Fill in weights, melting %, wastage
5. Automatic calculations for fine weight and amount
6. Add stone amount if applicable
7. Select payment type (Cash/Credit)
8. Save, Print, or Share voucher

### Ledger Management
- Add new customers
- Edit customer details
- View customer balances
- Delete customers (if no vouchers)

### Ledger Detail (Click on any ledger)
- View all transactions
- Filter by date range
- See vouchers and settlements
- Delete individual vouchers
- Delete all vouchers for a customer

### Settlement
1. Select customer
2. Choose metal type (Gold/Silver)
3. System auto-fetches balance
4. Enter metal rate
5. Enter fine weight to settle
6. Auto-calculates amount
7. Create settlement (reduces balance)

### Account Info
- View shop details
- See license expiry
- Change theme (Light/Dark/System)
- Toggle voucher number mode (Auto/Manual)
- Logout

---

## 6. Troubleshooting

### Application won't start

**Backend fails to start:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Start MongoDB if stopped
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

**Frontend fails to start:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Port conflicts

**Port 5000 already in use:**
```bash
# Edit backend/.env
PORT=5001
```

**Port 3000 already in use:**
```bash
# Edit frontend/vite.config.js
server: { port: 3001 }
```

### Database connection errors

1. Verify MongoDB is running
2. Check MongoDB URI in `backend/.env`
3. Default: `mongodb://localhost:27017/gold-silver-saas`

### Login issues

**Forgot admin password:**
```bash
cd backend
# Drop the users collection in MongoDB
mongosh gold-silver-saas --eval "db.users.drop()"
# Re-seed admin
npm run seed
```

### PWA installation not working

1. App must be served over HTTPS (except localhost)
2. Ensure service worker is registered
3. Check browser console for errors
4. Try clearing browser cache

---

## Production Deployment

### Build for Production

**Backend:**
```bash
cd backend
# Set NODE_ENV to production in .env
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the 'dist' folder with any static server
npx serve dist -p 3000
```

### Security Checklist

- [ ] Change JWT_SECRET in backend/.env
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS in production
- [ ] Set strong admin password
- [ ] Configure firewall rules
- [ ] Regular database backups

---

## Support & Maintenance

### Regular Backups

**MongoDB backup:**
```bash
mongodump --db gold-silver-saas --out /path/to/backup
```

**Restore from backup:**
```bash
mongorestore --db gold-silver-saas /path/to/backup/gold-silver-saas
```

### Updates

1. Backup your database
2. Extract new version
3. Run `npm install` in both folders
4. Restart servers

---

## Frequently Asked Questions

**Q: Can I use this offline?**
A: Yes, once installed as PWA. However, sync requires internet.

**Q: How many users can I add?**
A: Unlimited users. Limited only by your hardware.

**Q: Can I customize the app?**
A: Yes, full source code is provided. Modify as needed.

**Q: Is my data secure?**
A: Data is stored locally on your server. Use HTTPS and strong passwords.

**Q: Can I export data?**
A: Yes, use MongoDB export tools or build custom export features.

---

**For technical support, refer to README.md or check server logs.**

---

© 2024 Gold & Silver Shop Manager. All rights reserved.
