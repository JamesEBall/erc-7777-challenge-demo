// test/utils/network-validation.js
const { ethers } = require("hardhat");

const NETWORK_CONFIGS = {
    'base-sepolia': {
        chainId: 84532,
        name: 'Base Sepolia',
        verifyUrl: 'https://sepolia.basescan.org'
    }
};

async function validateNetwork() {
    const network = await ethers.provider.getNetwork();
    const networkName = network.name;
    
    if (!NETWORK_CONFIGS[networkName]) {
        throw new Error(`Unsupported network: ${networkName}`);
    }

    if (network.chainId !== NETWORK_CONFIGS[networkName].chainId) {
        throw new Error(
            `Invalid chain ID. Expected ${NETWORK_CONFIGS[networkName].chainId} ` +
            `(${networkName}) but got ${network.chainId}`
        );
    }

    return NETWORK_CONFIGS[networkName];
}

module.exports = {
    validateNetwork,
    NETWORK_CONFIGS
};