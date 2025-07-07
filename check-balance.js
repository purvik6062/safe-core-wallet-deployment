const { ethers } = require('ethers');
const dotenv = require('dotenv');

dotenv.config();

async function checkBalance() {
    try {
        // Private key provided by user
        const privateKey = process.env.AGENT_PRIVATE_KEY;

        // Arbitrum One RPC endpoint
        const arbitrumRPC = 'https://arb1.arbitrum.io/rpc';

        // Create wallet and provider
        const provider = new ethers.JsonRpcProvider(arbitrumRPC);
        const wallet = new ethers.Wallet(privateKey);

        // Get wallet address
        const address = wallet.address;
        console.log(`🔍 Checking balance for address: ${address}`);
        console.log(`🌐 Network: Arbitrum One`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        // Get balance
        const balance = await provider.getBalance(address);
        const balanceInEth = ethers.formatEther(balance);

        // Get network info
        const network = await provider.getNetwork();

        console.log(`💰 ETH Balance: ${balanceInEth} ETH`);
        console.log(`💰 Wei Balance: ${balance.toString()} wei`);
        console.log(`⛓️  Chain ID: ${network.chainId}`);
        console.log(`🔗 Network Name: ${network.name}`);

        // Check if balance is zero
        if (balance === 0n) {
            console.log(`⚠️  Warning: This address has no ETH balance on Arbitrum One`);
        }

    } catch (error) {
        console.error('❌ Error checking balance:', error.message);
    }
}

checkBalance(); 