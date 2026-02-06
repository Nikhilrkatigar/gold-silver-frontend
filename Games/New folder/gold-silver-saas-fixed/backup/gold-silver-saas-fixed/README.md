# Gold & Silver Shop SaaS - Complete Accounting System

A professional, full-featured Progressive Web App (PWA) for managing gold and silver shop accounts, billing, inventory, and customer ledgers.

## 🌟 Features

### Admin Features
- ✅ User management (Add, Edit, Delete users)
- ✅ License management with expiry tracking
- ✅ Dashboard with statistics
- ✅ Monitor soon-expiring licenses
- ✅ Bulk user operations

### User Features
- ✅ **Billing System** - Create detailed vouchers with multiple items
- ✅ **Ledger Management** - Manage customer accounts
- ✅ **Settlement System** - Process fine metal settlements
- ✅ **Credit Tracking** - Monitor due payments
- ✅ **Transaction History** - Filter and view all transactions
- ✅ **Account Settings** - Theme and preferences

### Technical Features
- 🚀 Progressive Web App (PWA) - Install on mobile/desktop
- 🌙 Dark/Light/System theme support
- 📱 Fully responsive design
- 🔐 JWT authentication
- 💾 MongoDB database
- ⚡ Real-time calculations
- 📊 Print and share vouchers

## 📋 Requirements

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## 🚀 Quick Start

### 1. Install MongoDB

**Ubuntu/Debian:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
Download and install from https://www.mongodb.com/try/download/community

### 2. Clone and Setup

```bash
# Extract the ZIP file
unzip gold-silver-saas.zip
cd gold-silver-saas
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file if needed (optional)
# Default MongoDB URI: mongodb://localhost:27017/gold-silver-saas
# Default PORT: 5000

# Start backend server
npm start
```

Backend will run on: http://localhost:5000

### 4. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: http://localhost:3000

### 5. Create Admin Account

Open your browser and go to: http://localhost:3000

The application will prompt you to create the first admin account on first run.

**Default credentials (if pre-seeded):**
- Phone: admin
- Password: admin123

## 📦 Production Build

### Backend (Production)

```bash
cd backend
npm start
```

### Frontend (Production)

```bash
cd frontend

# Build for production
npm run build

# Preview production build
npm run preview

# Or serve with a static server
npx serve dist -p 3000
```

## 🔧 Configuration

### Environment Variables (backend/.env)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gold-silver-saas
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
```

### Frontend API URL (frontend/.env)

```env
VITE_API_URL=http://localhost:5000/api
```

## 📱 PWA Installation

Once the app is running:

1. **Desktop (Chrome/Edge):**
   - Click the install icon in the address bar
   - Or go to Settings → Install Gold & Silver Manager

2. **Mobile (iOS):**
   - Open in Safari
   - Tap Share → Add to Home Screen

3. **Mobile (Android):**
   - Open in Chrome
   - Tap Menu → Add to Home Screen

## 🎨 Application Structure

```
gold-silver-saas/
├── backend/                 # Node.js/Express API
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   └── server.js           # Main server file
│
└── frontend/               # React application
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── pages/         # Page components
    │   │   ├── admin/     # Admin pages
    │   │   └── user/      # User pages
    │   ├── context/       # React context (Auth)
    │   ├── services/      # API services
    │   └── styles/        # Global CSS
    └── public/            # Static assets
```

## 🔐 Security Notes

1. **Change JWT Secret:** Update `JWT_SECRET` in `.env` before production
2. **MongoDB Security:** Enable authentication in production
3. **HTTPS:** Always use HTTPS in production
4. **Password Policy:** Enforce strong passwords for users

## 📊 Database Schema

### Users Collection
- Shop details, phone, password, role
- License expiry tracking
- Voucher settings

### Ledgers Collection
- Customer information
- Balance tracking (amount, gold, silver)
- Voucher references

### Vouchers Collection
- Billing information
- Item details with calculations
- Payment tracking

### Settlements Collection
- Fine metal settlements
- Balance updates

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongodb  # Linux
brew services list             # macOS

# Start MongoDB if not running
sudo systemctl start mongodb   # Linux
brew services start mongodb-community  # macOS
```

### Port Already in Use
```bash
# Change port in backend/.env
PORT=5001

# Or frontend/vite.config.js
server: { port: 3001 }
```

### Dependencies Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review MongoDB and Node.js logs
3. Ensure all dependencies are installed

## 📄 License

This project is provided as-is for use in gold and silver shops.

## 🎯 Roadmap

Future enhancements:
- [ ] Multi-language support
- [ ] Email notifications for expiring licenses
- [ ] Advanced reporting and analytics
- [ ] Barcode scanning support
- [ ] Cloud backup integration
- [ ] Multi-shop support

## 👏 Credits

Built with:
- React + Vite
- Node.js + Express
- MongoDB
- React Router
- React Icons
- Date-fns
- JWT Authentication

---

**Enjoy using Gold & Silver Shop Manager! ✨**
