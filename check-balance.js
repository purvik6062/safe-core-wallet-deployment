const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

// Network configurations (copied from networks.ts)
const NETWORKS = {
    ethereum: {
        name: "Ethereum Mainnet",
        rpc: process.env.ETHEREUM_RPC || "https://ethereum-rpc.publicnode.com",
        chainId: 1,
        currency: { name: "Ether", symbol: "ETH", decimals: 18 },
        isTestnet: false,
    },
    sepolia: {
        name: "Ethereum Sepolia",
        rpc: process.env.ETHEREUM_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com",
        chainId: 11155111,
        currency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
        isTestnet: true,
    },
    arbitrum: {
        name: "Arbitrum One",
        rpc: process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
        chainId: 42161,
        currency: { name: "Ether", symbol: "ETH", decimals: 18 },
        isTestnet: false,
    },
    arbitrum_sepolia: {
        name: "Arbitrum Sepolia",
        rpc: process.env.ARBITRUM_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc",
        chainId: 421614,
        currency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
        isTestnet: true,
    },
    polygon: {
        name: "Polygon Mainnet",
        rpc: process.env.POLYGON_RPC || "https://1rpc.io/matic",
        chainId: 137,
        currency: { name: "Polygon", symbol: "MATIC", decimals: 18 },
        isTestnet: false,
    },
    base: {
        name: "Base Mainnet",
        rpc: process.env.BASE_RPC || "https://mainnet.base.org",
        chainId: 8453,
        currency: { name: "Ether", symbol: "ETH", decimals: 18 },
        isTestnet: false,
    },
    base_sepolia: {
        name: "Base Sepolia",
        rpc: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
        chainId: 84532,
        currency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
        isTestnet: true,
    },
    optimism: {
        name: "Optimism Mainnet",
        rpc: process.env.OPTIMISM_RPC || "https://mainnet.optimism.io",
        chainId: 10,
        currency: { name: "Ether", symbol: "ETH", decimals: 18 },
        isTestnet: false,
    }
};

async function checkBalanceForNetwork(networkKey, networkConfig, walletAddress) {
    try {
        console.log(`\n🔍 Checking ${networkConfig.name} (${networkKey})`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Create provider
        const provider = new ethers.JsonRpcProvider(networkConfig.rpc);

        // Get balance with timeout
        const balancePromise = provider.getBalance(walletAddress);
        const networkPromise = provider.getNetwork();

        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const [balance, network] = await Promise.race([
            Promise.all([balancePromise, networkPromise]),
            timeout
        ]);

        const balanceFormatted = ethers.formatEther(balance);
        const symbol = networkConfig.currency.symbol;

        console.log(`💰 Balance: ${balanceFormatted} ${symbol}`);
        console.log(`⛓️  Chain ID: ${network.chainId} (Expected: ${networkConfig.chainId})`);
        console.log(`🔗 RPC: ${networkConfig.rpc}`);

        // Status indicators
        if (balance === 0n) {
            console.log(`⚠️  Status: No balance`);
        } else if (parseFloat(balanceFormatted) < 0.01) {
            console.log(`🟡 Status: Low balance`);
        } else {
            console.log(`✅ Status: Sufficient balance`);
        }

        return {
            network: networkKey,
            name: networkConfig.name,
            balance: balanceFormatted,
            symbol,
            chainId: network.chainId,
            isTestnet: networkConfig.isTestnet,
            status: balance === 0n ? 'no-balance' : parseFloat(balanceFormatted) < 0.01 ? 'low' : 'good',
            error: null
        };

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log(`🔗 RPC: ${networkConfig.rpc}`);

        return {
            network: networkKey,
            name: networkConfig.name,
            balance: 'ERROR',
            symbol: networkConfig.currency.symbol,
            chainId: networkConfig.chainId,
            isTestnet: networkConfig.isTestnet,
            status: 'error',
            error: error.message
        };
    }
}

async function checkAllBalances() {
    try {
        // Get wallet address
        const privateKey = process.env.AGENT_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('AGENT_PRIVATE_KEY environment variable is required');
        }

        const wallet = new ethers.Wallet(privateKey);
        const address = wallet.address;

        console.log(`🏦 Multi-Network Balance Checker`);
        console.log(`📝 Agent Address: ${address}`);
        console.log(`🌐 Checking ${Object.keys(NETWORKS).length} networks...`);
        console.log(`⏰ ${new Date().toISOString()}`);

        // Check all networks in parallel with some concurrency control
        const results = [];
        const networkEntries = Object.entries(NETWORKS);

        // Process in batches of 3 to avoid overwhelming RPC endpoints
        for (let i = 0; i < networkEntries.length; i += 3) {
            const batch = networkEntries.slice(i, i + 3);
            const batchPromises = batch.map(([key, config]) =>
                checkBalanceForNetwork(key, config, address)
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        // Summary
        console.log(`\n📊 BALANCE SUMMARY`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        const mainnetResults = results.filter(r => !r.isTestnet);
        const testnetResults = results.filter(r => r.isTestnet);

        console.log(`\n🌐 MAINNET NETWORKS:`);
        mainnetResults.forEach(result => {
            const statusIcon = result.status === 'good' ? '✅' :
                result.status === 'low' ? '🟡' :
                    result.status === 'no-balance' ? '⚠️' : '❌';
            console.log(`${statusIcon} ${result.name.padEnd(20)} ${result.balance.padStart(12)} ${result.symbol}`);
        });

        console.log(`\n🧪 TESTNET NETWORKS:`);
        testnetResults.forEach(result => {
            const statusIcon = result.status === 'good' ? '✅' :
                result.status === 'low' ? '🟡' :
                    result.status === 'no-balance' ? '⚠️' : '❌';
            console.log(`${statusIcon} ${result.name.padEnd(20)} ${result.balance.padStart(12)} ${result.symbol}`);
        });

        // Count status
        const goodCount = results.filter(r => r.status === 'good').length;
        const lowCount = results.filter(r => r.status === 'low').length;
        const noBalanceCount = results.filter(r => r.status === 'no-balance').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        console.log(`\n📈 STATISTICS:`);
        console.log(`📝 Agent Address: ${address}`);
        console.log(`✅ Sufficient Balance: ${goodCount}`);
        console.log(`🟡 Low Balance: ${lowCount}`);
        console.log(`⚠️  No Balance: ${noBalanceCount}`);
        console.log(`❌ Errors: ${errorCount}`);

        // Recommendations
        if (testnetResults.some(r => r.status === 'no-balance')) {
            console.log(`\n💡 RECOMMENDATIONS:`);
            console.log(`🚰 Get testnet funds from faucets:`);
            testnetResults.filter(r => r.status === 'no-balance').forEach(result => {
                if (result.network === 'sepolia') {
                    console.log(`   • Sepolia: https://www.alchemy.com/faucets/ethereum-sepolia`);
                } else if (result.network === 'arbitrum_sepolia') {
                    console.log(`   • Arbitrum Sepolia: https://www.alchemy.com/faucets/arbitrum-sepolia`);
                } else if (result.network === 'base_sepolia') {
                    console.log(`   • Base Sepolia: https://www.alchemy.com/faucets/base-sepolia`);
                }
            });
        }

    } catch (error) {
        console.error('❌ Error checking balances:', error.message);
    }
}

checkAllBalances(); 