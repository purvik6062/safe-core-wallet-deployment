# Safe Backend Service (TypeScript)

A production-ready TypeScript backend service for deploying and managing Safe (Gnosis Safe) wallets across multiple blockchain networks.

## 🚀 Features

- **Multi-Chain Safe Deployment**: Deploy Safe wallets across multiple networks simultaneously
- **Deterministic Addresses**: Same Safe address across all supported networks
- **Flexible Configuration**: Customizable owners, thresholds, and network selection
- **Automatic Status Management**: Safe status automatically updates from "initializing" to "active" upon successful deployment
- **Network Management**: Easy expansion to additional networks
- **Comprehensive Analytics**: Track deployments, transactions, and network usage
- **RESTful API**: Complete HTTP API for all Safe operations
- **Database Integration**: MongoDB for persistent data storage
- **Caching Layer**: Redis for improved performance
- **Production Ready**: Docker support, logging, monitoring, and security features
- **TypeScript** for type safety and better developer experience
- **Robust error handling** with detailed logging and monitoring
- **Comprehensive validation** with express-validator
- **Health checks** for monitoring service health

## 📋 Prerequisites

- Node.js (≥16.0.0)
- TypeScript (≥4.5.0)
- MongoDB (≥4.4.0)
- Redis (≥6.0.0)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository and navigate to safe-backend:**

   ```bash
   cd safe-backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp src/env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   # Basic Configuration
   PORT=3001
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/safe-deployment-service
   REDIS_URL=redis://localhost:6379

   # Blockchain (IMPORTANT: Use test keys for development)
   AGENT_PRIVATE_KEY=your_private_key_here
   ETHEREUM_RPC=https://ethereum-rpc.publicnode.com
   ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
   # ... other network RPCs
   ```

4. **Build the TypeScript code:**

   ```bash
   npm run build
   ```

5. **Start the service:**

   ```bash
   # Development (with hot reload)
   npm run dev

   # Production
   npm start
   ```

## 📁 Project Structure

```
safe-backend/
├── src/                     # TypeScript source code
│   ├── config/             # Configuration files
│   │   ├── logger.ts       # Winston logging configuration
│   │   └── networks.ts     # Multi-chain network definitions
│   ├── controllers/        # HTTP request handlers
│   │   └── SafeController.ts
│   ├── middleware/         # Express middleware
│   │   └── errorHandler.ts
│   ├── models/            # MongoDB models
│   │   └── Safe.ts        # Safe wallet model with TypeScript interfaces
│   ├── routes/            # API route definitions
│   │   ├── safe.ts        # Safe wallet routes
│   │   ├── network.ts     # Network information routes
│   │   └── health.ts      # Health check routes
│   ├── services/          # Business logic layer
│   │   └── SafeService.ts # Core Safe deployment logic
│   ├── server.ts          # Main server file
│   └── env.example        # Environment variables template
├── dist/                  # Compiled JavaScript (generated)
├── logs/                  # Application logs
├── package.json
├── tsconfig.json          # TypeScript configuration
└── README.md
```

## 🌐 API Endpoints

### Safe Management

- **POST** `/api/safe/deploy` - Deploy Safe wallets across networks
- **GET** `/api/safe/:safeId` - Get Safe by ID
- **GET** `/api/safe/address/:address` - Get Safe by address
- **GET** `/api/safe/user/:userId` - Get all Safes for a user
- **POST** `/api/safe/:safeId/expand` - Expand Safe to additional networks
- **PUT** `/api/safe/:safeId/metadata` - Update Safe metadata
- **GET** `/api/safe/search` - Search Safes with filters

### Network Information

- **GET** `/api/network/supported` - Get all supported networks
- **GET** `/api/network/groups/:groupName` - Get networks by group
- **GET** `/api/network/features/:featureName` - Get networks by feature
- **GET** `/api/network/recommendations/:useCase` - Get recommended networks

### Monitoring

- **GET** `/api/health` - Basic health check
- **GET** `/api/health/detailed` - Detailed health check with dependencies
- **GET** `/api/safe/network/stats` - Network deployment statistics
- **GET** `/api/safe/user/:userId/stats` - User statistics

## 🔧 Configuration

### Supported Networks

| Network          | Chain ID | Type    | Features                    |
| ---------------- | -------- | ------- | --------------------------- |
| Ethereum         | 1        | Mainnet | DeFi Hub, Highest Liquidity |
| Sepolia          | 11155111 | Testnet | Testing, Development        |
| Arbitrum One     | 42161    | Mainnet | Low Fees, Fast Execution    |
| Arbitrum Sepolia | 421614   | Testnet | Testing, Low Fees           |
| Polygon          | 137      | Mainnet | Ultra Low Fees, Gaming      |
| Base             | 8453     | Mainnet | Coinbase Integration        |
| Optimism         | 10       | Mainnet | Low Fees, DeFi Focus        |

### Safe Configuration

- **Owners**: User wallet + Agent wallet (2 owners)
- **Threshold**: 1 (either owner can execute)
- **Version**: 1.4.1
- **Deterministic**: Uses salt nonce for predictable addresses

## 🔐 Security Features

- **Rate limiting** to prevent API abuse
- **CORS protection** with configurable origins
- **Helmet** for security headers
- **Input validation** with express-validator
- **Error handling** without exposing sensitive information
- **Environment-based configuration** for secrets

## 📊 TypeScript Benefits

This service is fully written in TypeScript, providing:

- **Type Safety**: Compile-time error checking
- **Better IDE Support**: IntelliSense and auto-completion
- **Refactoring Safety**: Confident code changes
- **Documentation**: Self-documenting interfaces
- **Maintainability**: Easier to understand and modify

### Key TypeScript Features Used

- **Interfaces**: Comprehensive type definitions for all data structures
- **Enums**: Network keys and status types
- **Generics**: Flexible and reusable components
- **Union Types**: Precise type constraints
- **Type Guards**: Runtime type checking

## 📝 Usage Examples

### Deploy a Safe

```bash
curl -X POST http://localhost:3001/api/safe/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "userInfo": {
      "userId": "user123",
      "walletAddress": "0x742d35Cc6634C0532925a3b8D6C6d6f0A0c8e9b2"
    },
    "config": {
      "networks": ["sepolia", "arbitrum_sepolia", "base_sepolia"],
      "description": "My trading Safe",
      "tags": ["trading", "defi"]
    }
  }'
```

### Get Safe Information

```bash
curl http://localhost:3001/api/safe/user/user123
```

### Check Network Health

```bash
curl http://localhost:3001/api/health/detailed
```

## 🔍 Monitoring & Logging

- **Winston** logger with multiple transports
- **Structured logging** with JSON format
- **Error tracking** with stack traces
- **Performance monitoring** with request timing
- **Health checks** for dependencies

## 🧪 Development

### Building

```bash
# Compile TypeScript
npm run build

# Watch mode for development
npm run dev
```

### Environment Variables

Key environment variables:

- `AGENT_PRIVATE_KEY`: Private key for Safe deployment when `agentType` is perpetuals (default; ⚠️ Use test keys only)
- `SPOT_AGENT_PRIVATE_KEY`: Private key for Safe deployment when `agentType` is spot (⚠️ Use test keys only)
- `MONGODB_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection URL
- `*_RPC`: RPC endpoints for each blockchain network

## 🚀 Production Deployment

1. **Build the application:**

   ```bash
   npm run build
   ```

2. **Set production environment variables**

3. **Start with process manager:**

   ```bash
   pm2 start dist/server.js --name safe-backend
   ```

4. **Monitor logs:**
   ```bash
   pm2 logs safe-backend
   ```

## 🤝 Integration

This service integrates with:

- **AI Agent Backend**: Provides Safe wallet management for autonomous trading
- **Safe Protocol Kit**: Official Safe SDK for deployment and management
- **Multiple blockchains**: Ethereum, Arbitrum, Polygon, Base, Optimism
- **MongoDB**: For persistent Safe data storage
- **Redis**: For caching and performance optimization

## 📚 Technical Stack

- **TypeScript**: Type-safe JavaScript
- **Express.js**: Web framework
- **MongoDB**: Document database
- **Redis**: In-memory cache
- **Safe Protocol Kit**: Safe wallet SDK
- **ethers.js**: Ethereum library
- **Winston**: Logging
- **Express Validator**: Input validation

## 🔒 License

This project is licensed under the MIT License - see the LICENSE file for details.
