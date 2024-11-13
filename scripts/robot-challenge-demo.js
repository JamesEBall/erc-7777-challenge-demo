// scripts/robot-challenge-demo.js
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function getDeploymentInfo() {
    const deploymentPath = path.join(__dirname, '..', 'deployment-info.json');
    if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath));
        // Verify the deployer matches
        const [deployer] = await ethers.getSigners();
        if (deployment.deployer === deployer.address) {
            return deployment;
        }
    }
    return null;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n🤖 Robot Challenge-Response Demo");
    console.log("Deployer address:", deployer.address);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

    let realRobot, impostorRobot, realRobotWallet, impostorWallet;
    let deploymentInfo = await getDeploymentInfo();

    if (deploymentInfo) {
        console.log("\n📂 Found existing deployment, loading contracts...");
        const MockRobot = await ethers.getContractFactory("MockRobot");
        realRobot = MockRobot.attach(deploymentInfo.realRobot.address);
        impostorRobot = MockRobot.attach(deploymentInfo.impostorRobot.address);
        
        // Recreate wallets from saved private keys
        realRobotWallet = new ethers.Wallet(deploymentInfo.realRobot.privateKey);
        impostorWallet = new ethers.Wallet(deploymentInfo.impostorRobot.privateKey);
        
        console.log("Loaded real robot from:", await realRobot.getAddress());
        console.log("Loaded impostor robot from:", await impostorRobot.getAddress());
    } else {
        console.log("\n🏗️  No existing deployment found, deploying new contracts...");
        
        // Generate keys for real robot
        realRobotWallet = ethers.Wallet.createRandom();
        const realRobotPublicKeyBytes32 = ethers.keccak256(
            ethers.toUtf8Bytes(realRobotWallet.address)
        );

        // Generate keys for impostor robot
        impostorWallet = ethers.Wallet.createRandom();
        const impostorPublicKeyBytes32 = ethers.keccak256(
            ethers.toUtf8Bytes(impostorWallet.address)
        );

        // Deploy both robot contracts
        const MockRobot = await ethers.getContractFactory("MockRobot");
        
        console.log("\nDeploying real robot...");
        realRobot = await MockRobot.deploy(
            realRobotPublicKeyBytes32,
            "RobotCorp",
            "AuthenticOperator",
            "TrueBot-1",
            "REAL123"
        );

        await realRobot.waitForDeployment();
        console.log("Real robot deployed to:", await realRobot.getAddress());

        console.log("\nDeploying impostor robot...");
        impostorRobot = await MockRobot.deploy(
            impostorPublicKeyBytes32,
            "RobotCorp",
            "AuthenticOperator",
            "TrueBot-1",
            "REAL123"
        );

        await impostorRobot.waitForDeployment();
        console.log("Impostor robot deployed to:", await impostorRobot.getAddress());

        // Save deployment info
        deploymentInfo = {
            network: hre.network.name,
            deployer: deployer.address,
            realRobot: {
                address: await realRobot.getAddress(),
                privateKey: realRobotWallet.privateKey,
                publicKeyHash: realRobotPublicKeyBytes32
            },
            impostorRobot: {
                address: await impostorRobot.getAddress(),
                privateKey: impostorWallet.privateKey,
                publicKeyHash: impostorPublicKeyBytes32
            },
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
            path.join(__dirname, '..', 'deployment-info.json'),
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("\nDeployment info saved to deployment-info.json");
    }

    // Challenge-Response Test
    console.log("\n🔐 Starting Challenge-Response Test...");

    console.log("\n📤 Generating challenge for real robot...");
    const realChallengeTx = await realRobot.generateChallenge();
    const realChallengeReceipt = await realChallengeTx.wait();
    
    const challenge = realChallengeReceipt.logs[0].args[0];
    console.log("Challenge generated:", challenge);

    // Sign with both wallets
    console.log("\n✍️  Signing challenges...\n");
    
    const realSignature = await realRobotWallet.signMessage(
        ethers.getBytes(challenge)
    );
    const fakeSignature = await impostorWallet.signMessage(
        ethers.getBytes(challenge)
    );

    // Verify signatures with improved display
    console.log("🔍 Verification Results:");
    console.log("========================");

    // Real robot verification
    process.stdout.write("Verifying real robot... ");
    try {
        const realVerification = await realRobot.verifyChallenge(challenge, realSignature);
        const realResult = await realVerification.wait();
        console.log("✅ PASSED");
        console.log("Transaction:", realResult.hash);
    } catch (error) {
        console.log("❌ FAILED");
        console.error("Error:", error.message);
    }

    // Impostor verification
    process.stdout.write("\nVerifying impostor robot... ");
    try {
        const fakeVerification = await realRobot.verifyChallenge(challenge, fakeSignature);
        const fakeResult = await fakeVerification.wait();
        console.log("❌ PASSED (Unexpected!)");
        console.log("Transaction:", fakeResult.hash);
    } catch (error) {
        console.log("✅ FAILED (Expected)");
        console.log("The impostor was successfully detected!");
    }

    console.log("\n📋 Contract Addresses:");
    console.log("Real Robot:", await realRobot.getAddress());
    console.log("Impostor Robot:", await impostorRobot.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error("\n❌ Error occurred!");
        console.error(error);
        process.exit(1);
    });