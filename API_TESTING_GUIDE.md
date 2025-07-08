# Safe API Testing Guide

This guide provides complete API endpoints and JSON examples for testing the Safe Deployment & Management Service in Postman or any API testing platform.

## 📋 Prerequisites

- **Base URL**: `http://localhost:3000` (adjust for your environment)
- **Content-Type**: `application/json` for POST/PUT requests
- **Authorization**: Add your API key if authentication is required

## 🧪 Test Data Variables

Create these variables in Postman for reusable test data:

```json
{
  "baseUrl": "http://localhost:3000",
  "testUserId": "test-user-123",
  "testWalletAddress": "0x742d35Cc6552C0532025e4d96e0f3752b6D72B66",
  "testEmail": "test@example.com",
  "testSafeId": "{{safeId}}", // Will be populated after deployment
  "testAddress": "{{safeAddress}}" // Will be populated after deployment
}
```

---

## 🏥 Health Check Endpoints

### 1. Basic Health Check

```http
GET {{baseUrl}}/api/health
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "Safe Deployment & Management Service",
    "version": "1.0.0",
    "uptime": 3600.5,
    "environment": "development"
  }
}
```

### 2. Safe Service Health Check

```http
GET {{baseUrl}}/api/safe/health
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "service": "SafeService",
    "status": "operational",
    "connections": {
      "database": "connected",
      "networks": "healthy"
    }
  }
}
```

---

## 🌐 Network Information Endpoints

### 3. Get All Supported Networks

```http
GET {{baseUrl}}/api/network/supported
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "networks": [
      {
        "key": "ethereum",
        "name": "Ethereum Mainnet",
        "chainId": 1,
        "isTestnet": false,
        "features": ["defi_hub", "highest_liquidity"],
        "currency": {
          "name": "Ether",
          "symbol": "ETH",
          "decimals": 18
        }
      }
    ],
    "total": 7,
    "groups": {},
    "features": {}
  }
}
```

### 4. Get Testnet Networks Only

```http
GET {{baseUrl}}/api/network/supported?type=testnet
```

### 5. Get Mainnet Networks Only

```http
GET {{baseUrl}}/api/network/supported?type=mainnet
```

### 6. Get Networks by Group - Testnet

```http
GET {{baseUrl}}/api/network/groups/testnet
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "group": "testnet",
    "networks": [
      {
        "name": "Ethereum Sepolia",
        "chainId": 11155111,
        "isTestnet": true
      }
    ],
    "total": 2
  }
}
```

### 7. Get Networks by Group - Layer 2

```http
GET {{baseUrl}}/api/network/groups/layer2
```

### 8. Get Networks by Feature - Low Fees

```http
GET {{baseUrl}}/api/network/features/low_fees
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "feature": "low_fees",
    "networks": [
      {
        "name": "Arbitrum One",
        "chainId": 42161,
        "features": ["low_fees", "fast_execution"]
      }
    ],
    "total": 4
  }
}
```

### 9. Get Network Recommendations - DeFi

```http
GET {{baseUrl}}/api/network/recommendations/defi
```

### 10. Get Network Recommendations - Gaming

```http
GET {{baseUrl}}/api/network/recommendations/gaming
```

---

## 🚀 Safe Deployment Endpoints

### 11. Deploy Safe with Default Networks

```http
POST {{baseUrl}}/api/safe/deploy
Content-Type: application/json
```

**Request Body:**

```json
{
  "userInfo": {
    "userId": "{{testUserId}}",
    "walletAddress": "{{testWalletAddress}}",
    "email": "{{testEmail}}"
  },
  "config": {
    "description": "My First Safe Wallet",
    "tags": ["personal", "defi"]
  }
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Safe deployed on 2 network(s)",
  "data": {
    "safeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "commonAddress": "0x1234567890123456789012345678901234567890",
    "config": {
      "owners": [
        "0x742d35Cc6552C0532025e4d96e0f3752b6D72B66",
        "0xAgentWalletAddress..."
      ],
      "threshold": 1,
      "saltNonce": "0x..."
    },
    "deployments": {
      "sepolia": {
        "networkKey": "sepolia",
        "chainId": 11155111,
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "deployed",
        "deploymentTxHash": "0x...",
        "explorerUrl": "https://sepolia.etherscan.io/tx/0x..."
      },
      "arbitrum_sepolia": {
        "networkKey": "arbitrum_sepolia",
        "chainId": 421614,
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "deployed"
      }
    },
    "successfulNetworks": ["sepolia", "arbitrum_sepolia", "base_sepolia"],
    "totalNetworks": 2
  }
}
```

### 12. Deploy Safe with Specific Networks

```http
POST {{baseUrl}}/api/safe/deploy
Content-Type: application/json
```

**Request Body:**

```json
{
  "userInfo": {
    "userId": "user-multichain-456",
    "walletAddress": "0x8ba1f109551bD432803012645Hac136c94ba2fac",
    "email": "multichain@example.com"
  },
  "config": {
    "networks": ["polygon", "base", "optimism"],
    "autoExpand": true,
    "description": "Multi-chain DeFi Safe",
    "tags": ["defi", "yield-farming", "multi-chain"]
  }
}
```

### 13. Deploy Safe - Enterprise Configuration

```http
POST {{baseUrl}}/api/safe/deploy
Content-Type: application/json
```

**Request Body:**

```json
{
  "userInfo": {
    "userId": "enterprise-user-789",
    "walletAddress": "0x9cB1f109551bD432803012645Hac136c94ba2fac",
    "email": "enterprise@company.com"
  },
  "config": {
    "networks": ["ethereum", "arbitrum", "polygon"],
    "autoExpand": false,
    "description": "Enterprise Treasury Safe",
    "tags": ["enterprise", "treasury", "high-value"]
  }
}
```

### 1. Deploy Safe Wallets

Deploy Safe wallets across multiple networks for a user.

```http
POST {{baseUrl}}/api/safe/deploy
Content-Type: application/json

{
  "userInfo": {
    "userId": "test-user-123",
    "walletAddress": "0x742d35Cc6681C4C5a6b1F55F64e5Df6B4F3a8532",
    "email": "test@example.com",
    "preferences": {
      "defaultNetworks": ["sepolia", "arbitrum_sepolia", "base_sepolia"],
      "autoExpand": false,
      "notifications": {
        "email": true,
        "webhook": false
      }
    }
  },
  "config": {
    "networks": ["sepolia", "arbitrum_sepolia", "base_sepolia"],
    "autoExpand": false,
    "description": "My trading Safe",
    "tags": ["trading", "defi"]
  }
}
```

**Important Notes:**

- Safe status automatically changes from `initializing` to `active` when at least one deployment is successful
- User wallet address must be different from the agent wallet address
- All owner addresses must be unique

**Response:**

```json
{
  "success": true,
  "message": "Safe deployed on 2 network(s)",
  "data": {
    "safeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "commonAddress": "0x1234567890123456789012345678901234567890",
    "config": {
      "owners": [
        "0x742d35Cc6552C0532025e4d96e0f3752b6D72B66",
        "0xAgentWalletAddress..."
      ],
      "threshold": 1,
      "saltNonce": "0x..."
    },
    "deployments": {
      "sepolia": {
        "networkKey": "sepolia",
        "chainId": 11155111,
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "deployed",
        "deploymentTxHash": "0x...",
        "explorerUrl": "https://sepolia.etherscan.io/tx/0x..."
      },
      "arbitrum_sepolia": {
        "networkKey": "arbitrum_sepolia",
        "chainId": 421614,
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "deployed"
      }
    },
    "successfulNetworks": ["sepolia", "arbitrum_sepolia", "base_sepolia"],
    "totalNetworks": 2
  }
}
```

---

## 🔍 Safe Retrieval Endpoints

### 14. Get Safe by ID

```http
GET {{baseUrl}}/api/safe/{{testSafeId}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "safeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "userInfo": {
      "userId": "test-user-123",
      "walletAddress": "0x742d35Cc6552C0532025e4d96e0f3752b6D72B66",
      "email": "test@example.com",
      "preferences": {
        "defaultNetworks": ["sepolia", "arbitrum_sepolia", "base_sepolia"],
        "autoExpand": false,
        "notifications": {
          "email": true,
          "webhook": false
        }
      }
    },
    "config": {
      "owners": ["0x742d35Cc6552C0532025e4d96e0f3752b6D72B66", "0xAgent..."],
      "threshold": 1,
      "saltNonce": "0x...",
      "safeVersion": "1.4.1"
    },
    "deployments": {
      "sepolia": {
        "networkKey": "sepolia",
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "deployed"
      }
    },
    "status": "active",
    "metadata": {
      "description": "My First Safe Wallet",
      "tags": ["personal", "defi"],
      "totalDeployments": 2,
      "activeNetworks": ["sepolia", "arbitrum_sepolia", "base_sepolia"]
    }
  }
}
```

### 15. Get Safe by Address

```http
GET {{baseUrl}}/api/safe/address/{{testAddress}}
```

### 16. Get All Safes for User

```http
GET {{baseUrl}}/api/safe/user/{{testUserId}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "safes": [
      {
        "safeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "userInfo": {
          "userId": "test-user-123"
        },
        "deployments": {},
        "status": "active"
      }
    ],
    "total": 1,
    "user": {
      "userId": "test-user-123",
      "totalSafes": 1
    }
  }
}
```

### 17. Get User Statistics

```http
GET {{baseUrl}}/api/safe/user/{{testUserId}}/stats
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "totalSafes": 3,
    "activeDeployments": 8,
    "totalTransactions": 245,
    "totalValueTransferred": "15.75",
    "mostUsedNetwork": "polygon"
  }
}
```

### 18. Get Network Statistics

```http
GET {{baseUrl}}/api/safe/network/stats
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "totalSafes": 150,
    "deployments": {
      "sepolia": 89,
      "arbitrum_sepolia": 76,
      "polygon": 45,
      "base": 23,
      "optimism": 18
    },
    "mostPopularNetwork": "sepolia"
  }
}
```

---

## 🔎 Safe Search Endpoints

### 19. Search All Safes

```http
GET {{baseUrl}}/api/safe/search
```

### 20. Search Safes by User ID

```http
GET {{baseUrl}}/api/safe/search?userId={{testUserId}}
```

### 21. Search Safes by Status

```http
GET {{baseUrl}}/api/safe/search?status=active
```

### 22. Search Safes by Networks

```http
GET {{baseUrl}}/api/safe/search?networks=polygon,base
```

### 23. Search Safes by Tags

```http
GET {{baseUrl}}/api/safe/search?tags=defi,enterprise
```

### 24. Advanced Search with Multiple Filters

```http
GET {{baseUrl}}/api/safe/search?userId={{testUserId}}&status=active&networks=sepolia,arbitrum_sepolia,base_sepolia&tags=personal
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "safes": [
      {
        "safeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "userInfo": {
          "userId": "test-user-123"
        },
        "status": "active",
        "metadata": {
          "tags": ["personal", "defi"]
        }
      }
    ],
    "total": 1,
    "filters": {
      "userId": "test-user-123",
      "status": "active",
      "networks": ["sepolia", "arbitrum_sepolia", "base_sepolia"],
      "tags": ["personal"]
    }
  }
}
```

---

## 🌍 Safe Expansion Endpoints

### 25. Expand Safe to New Networks

```http
POST {{baseUrl}}/api/safe/{{testSafeId}}/expand
Content-Type: application/json
```

**Request Body:**

```json
{
  "networks": ["polygon", "base", "optimism"]
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Safe expanded to 3 new network(s)",
  "data": {
    "safeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "newDeployments": {
      "polygon": {
        "networkKey": "polygon",
        "chainId": 137,
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "deployed",
        "deploymentTxHash": "0x...",
        "explorerUrl": "https://polygonscan.com/tx/0x..."
      },
      "base": {
        "networkKey": "base",
        "chainId": 8453,
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "deployed"
      },
      "optimism": {
        "networkKey": "optimism",
        "chainId": 10,
        "address": "0x1234567890123456789012345678901234567890",
        "deploymentStatus": "failed",
        "error": "Insufficient gas funds"
      }
    },
    "successfulNetworks": ["polygon", "base"],
    "totalNewNetworks": 3
  }
}
```

### 26. Expand to Single Network

```http
POST {{baseUrl}}/api/safe/{{testSafeId}}/expand
Content-Type: application/json
```

**Request Body:**

```json
{
  "networks": ["ethereum"]
}
```

### 27. Expand to All Layer 2 Networks

```http
POST {{baseUrl}}/api/safe/{{testSafeId}}/expand
Content-Type: application/json
```

**Request Body:**

```json
{
  "networks": ["arbitrum", "polygon", "base", "optimism"]
}
```

---

## ✏️ Safe Metadata Update Endpoints

### 28. Update Safe Metadata

```http
PUT {{baseUrl}}/api/safe/{{testSafeId}}/metadata
Content-Type: application/json
```

**Request Body:**

```json
{
  "metadata": {
    "description": "Updated Safe description for DeFi operations",
    "tags": ["defi", "updated", "yield-farming"],
    "category": "personal",
    "riskLevel": "medium",
    "lastReviewDate": "2024-01-15",
    "customFields": {
      "purpose": "DeFi yield farming",
      "maxTransactionAmount": "1000",
      "approvedTokens": ["USDC", "ETH", "WBTC"]
    }
  }
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Safe metadata updated successfully",
  "data": {
    "safeId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "metadata": {
      "description": "Updated Safe description for DeFi operations",
      "tags": ["defi", "updated", "yield-farming"],
      "category": "personal",
      "riskLevel": "medium",
      "lastReviewDate": "2024-01-15",
      "customFields": {
        "purpose": "DeFi yield farming",
        "maxTransactionAmount": "1000",
        "approvedTokens": ["USDC", "ETH", "WBTC"]
      },
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 29. Update Safe Tags Only

```http
PUT {{baseUrl}}/api/safe/{{testSafeId}}/metadata
Content-Type: application/json
```

**Request Body:**

```json
{
  "metadata": {
    "tags": ["enterprise", "treasury", "multi-sig"]
  }
}
```

### 30. Update Safe Description Only

```http
PUT {{baseUrl}}/api/safe/{{testSafeId}}/metadata
Content-Type: application/json
```

**Request Body:**

```json
{
  "metadata": {
    "description": "Enterprise treasury Safe for company funds"
  }
}
```

### 31. Update Safe Metadata

Update metadata for an existing Safe.

```http
PUT {{baseUrl}}/api/safe/{{safeId}}/metadata
Content-Type: application/json

{
  "metadata": {
    "description": "Updated description",
    "tags": ["trading", "defi", "updated"]
  }
}
```

### 32. Update Safe Status

Update the status of an existing Safe (admin operation).

```http
PUT {{baseUrl}}/api/safe/{{safeId}}/status
Content-Type: application/json

{
  "status": "active"
}
```

**Status Values:**

- `initializing` - Safe is being created (default)
- `active` - Safe has successful deployments
- `suspended` - Safe is temporarily disabled
- `archived` - Safe is permanently disabled

**Note:** Safe status automatically changes from `initializing` to `active` when at least one deployment is successful.

**Response:**

```json
{
  "success": true,
  "message": "Safe status updated successfully",
  "data": {
    // Safe object with updated status
  }
}
```
