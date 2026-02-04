#!/bin/bash

# Gold & Silver Shop SaaS - Automated Setup Script

echo "======================================"
echo "Gold & Silver Shop SaaS - Setup"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found:${NC} $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm found:${NC} $(npm --version)"

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo -e "${YELLOW}⚠ MongoDB not found in PATH${NC}"
    echo "Please ensure MongoDB is installed and running"
    echo "Install from: https://www.mongodb.com/try/download/community"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ MongoDB found${NC}"
fi

echo ""
echo "======================================"
echo "Setting up Backend..."
echo "======================================"
echo ""

cd backend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
fi

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install backend dependencies${NC}"
    exit 1
fi

cd ..

echo ""
echo "======================================"
echo "Setting up Frontend..."
echo "======================================"
echo ""

cd frontend

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

echo ""
echo "======================================"
echo "Setup Complete! ✨"
echo "======================================"
echo ""
echo "To start the application:"
echo ""
echo "1. Start MongoDB (if not running):"
echo "   sudo systemctl start mongodb  (Linux)"
echo "   brew services start mongodb-community  (macOS)"
echo ""
echo "2. Start Backend (in one terminal):"
echo "   cd backend"
echo "   npm start"
echo ""
echo "3. Start Frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Open your browser:"
echo "   http://localhost:3000"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
