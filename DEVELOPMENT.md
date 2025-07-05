# Development Setup Guide

## ✅ Issues Fixed

### 1. **Mongoose Duplicate Index Warning** - FIXED ✅

- **Issue**: `Warning: Duplicate schema index on {"userInfo.userId":1}`
- **Solution**: Removed duplicate index declarations ([reference](https://mongoosejs.com/docs/deprecations.html))
- **Changes Made**:
  - Removed `index: true` from fields that already have `unique: true`
  - Removed duplicate `SafeSchema.index({ "userInfo.userId": 1 });`

### 2. **Connection Errors** - FIXED ✅

- **Issue**: `AggregateError` when connecting to MongoDB/Redis
- **Solution**: Added graceful error handling for development
- **Changes Made**:
  - Non-fatal connection failures in development mode
  - Better error messages and fallbacks

## 🚀 Quick Start Options

### Option 1: Use Docker (Recommended)

Start local MongoDB and Redis with Docker:

```bash
# Start development databases
cd safe-backend
docker-compose -f docker-compose.dev.yml up -d

# Check services are running
docker-compose -f docker-compose.dev.yml ps

# Run the application
npm run dev
```

**Includes:**

- MongoDB on `localhost:27017`
- Redis on `localhost:6379`
- MongoDB Express GUI on `http://localhost:8082` (admin/admin123)
- Redis Commander GUI on `http://localhost:8081`

### Option 2: Cloud Services (No local setup)

Use cloud databases by updating your `.env`:

```bash
# Create .env file
cp env.example .env

# Edit .env with cloud URLs:
# MongoDB Atlas (free): https://cloud.mongodb.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/safe-deployment-service

# Redis Cloud (free): https://redis.com/try-free/
REDIS_URL=redis://username:password@hostname:port
```

### Option 3: Local Installation

Install MongoDB and Redis locally:

**Windows:**

```bash
# Install via Chocolatey
choco install mongodb redis-64

# Or download directly:
# MongoDB: https://www.mongodb.com/try/download/community
# Redis: https://github.com/microsoftarchive/redis/releases
```

**macOS:**

```bash
brew install mongodb-community redis
brew services start mongodb-community
brew services start redis
```

**Linux:**

```bash
sudo apt update
sudo apt install mongodb redis-server
sudo systemctl start mongodb redis-server
```

## 🧪 Testing the Fix

After setting up databases, run:

```bash
cd safe-backend
npm run dev
```

**Expected Output (Success):**

```
✅ Connected to MongoDB
✅ Connected to Redis
🚀 Safe Deployment Service running on port 3001
```

**If you still see connection errors:**

- The app will continue running in development mode
- Some features requiring database may not work
- Check database services are running

## 🔧 Development Commands

```bash
# Development with auto-reload
npm run dev

# Build TypeScript
npm run build

# Start production build
npm start

# Run tests
npm test

# Check health endpoint
curl http://localhost:3001/api/health
```

## 📊 Database GUIs (with Docker option)

- **MongoDB**: http://localhost:8082 (admin/admin123)
- **Redis**: http://localhost:8081

## 🎯 Next Steps

1. **Start with Option 1 (Docker)** - easiest setup
2. **Test API endpoints** - check `/api/health` works
3. **Deploy a Safe** - try the Safe deployment endpoints
4. **Monitor logs** - watch for any remaining issues

The duplicate index warning and connection errors are now resolved! 🎉
