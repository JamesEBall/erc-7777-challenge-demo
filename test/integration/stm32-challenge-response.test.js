// test/integration/stm32-challenge-response.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("STM32 Challenge-Response Integration", function() {
    let mockRobot;
    let owner;
    let robotWallet;
    let impostorWallet;

    before(async function() {
        [owner] = await ethers.getSigners();
        
        // Create wallets
        robotWallet = ethers.Wallet.createRandom();
        impostorWallet = ethers.Wallet.createRandom();

        console.log("\n🔐 Setting up test environment...");
        console.log("Robot wallet address:", robotWallet.address);
        console.log("Impostor wallet address:", impostorWallet.address);
    });

    beforeEach(async function() {
        const MockRobot = await ethers.getContractFactory("MockRobot");
        
        // Important: Use the address as the public key for the hardware identity
        const publicKeyBytes32 = ethers.zeroPadValue(robotWallet.address, 32);
        
        mockRobot = await MockRobot.deploy(
            publicKeyBytes32,
            "RobotCorp",
            "AuthenticOperator",
            "TrueBot-1",
            "REAL123"
        );

        await mockRobot.waitForDeployment();
        console.log("Mock Robot deployed to:", await mockRobot.getAddress());
    });

    it("should successfully verify authentic robot signature", async function() {
        console.log("\n🤖 Testing authentic robot verification...");
        
        // Generate challenge
        const challengeTx = await mockRobot.generateChallenge();
        const receipt = await challengeTx.wait();
        const event = receipt.logs.find(x => x.fragment?.name === 'ChallengeGenerated');
        const challenge = event.args[0];
        console.log("Challenge generated:", challenge);

        // Sign with real robot wallet
        const signature = await robotWallet.signMessage(ethers.getBytes(challenge));
        console.log("Signature created:", signature);

        // Verify
        const verificationTx = await mockRobot.verifyChallenge(challenge, signature);
        const verificationReceipt = await verificationTx.wait();
        const verificationEvent = verificationReceipt.logs.find(
            x => x.fragment?.name === 'ChallengeVerified'
        );
        
        expect(verificationEvent.args[1]).to.be.true;
        console.log("✅ Authentic robot verification passed");
    });

    it("should reject impostor robot signature", async function() {
        console.log("\n🚫 Testing impostor rejection...");
        
        // Generate challenge
        const challengeTx = await mockRobot.generateChallenge();
        const receipt = await challengeTx.wait();
        const event = receipt.logs.find(x => x.fragment?.name === 'ChallengeGenerated');
        const challenge = event.args[0];
        console.log("Challenge generated:", challenge);

        // Sign with impostor wallet
        const signature = await impostorWallet.signMessage(ethers.getBytes(challenge));
        console.log("Impostor signature created:", signature);

        // Verify (should return false)
        const verificationTx = await mockRobot.verifyChallenge(challenge, signature);
        const verificationReceipt = await verificationTx.wait();
        const verificationEvent = verificationReceipt.logs.find(
            x => x.fragment?.name === 'ChallengeVerified'
        );
        
        expect(verificationEvent.args[1]).to.be.false;
        console.log("✅ Impostor rejection successful");
    });

    after(async function() {
        console.log("\n✅ Tests completed");
    });
});