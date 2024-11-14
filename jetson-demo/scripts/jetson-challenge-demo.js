const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n🤖 Jetson Robot Challenge Demo");
    console.log("Deployer address:", deployer.address);

    // Load the Jetson robot config
    const configPath = path.join(__dirname, '..', 'robot', 'config.json');
    const robotConfig = JSON.parse(fs.readFileSync(configPath));
    
    console.log("\n📂 Loading Jetson robot contract...");
    const MockRobot = await ethers.getContractFactory("MockRobot");
    const jetsonRobot = MockRobot.attach(robotConfig.robotAddress);
    
    console.log("Loaded Jetson robot from:", robotConfig.robotAddress);
    console.log("Network:", robotConfig.network);

    // Generate challenge
    console.log("\n📤 Generating challenge for Jetson robot...");
    const challengeTx = await jetsonRobot.generateChallenge();
    console.log("Challenge TX sent:", challengeTx.hash);
    console.log("Etherscan:", `https://sepolia.basescan.org/tx/${challengeTx.hash}`);
    
    const receipt = await challengeTx.wait();
    console.log("Challenge TX confirmed in block:", receipt.blockNumber);

    // Get challenge from raw logs
    const challenge = receipt.logs[0].data;
    console.log("\nChallenge data:", challenge);

    console.log("\n⏳ Waiting for Jetson verifier to respond...");
    console.log("Challenge we're waiting for:", challenge);

    // Add event listener for all events from the contract for debugging
    jetsonRobot.on("*", (event) => {
        console.log("Received any event:", {
            eventName: event.eventName,
            args: event.args,
            event: event
        });
    });

    const filter = jetsonRobot.filters.ChallengeVerified();
    console.log("Monitoring for verification with filter:", filter);

    const events = await new Promise((resolve) => {
        jetsonRobot.on(filter, (...args) => {
            // The event data is in the last argument
            const eventData = args[args.length - 1];
            const [receivedChallenge, isValid] = eventData.args;
            
            console.log("Received ChallengeVerified event:", {
                receivedChallenge,
                isValid,
                eventData
            });
            
            if (receivedChallenge.toLowerCase() === challenge.toLowerCase()) {
                console.log("Challenge matched! Resolving...");
                jetsonRobot.removeAllListeners();
                resolve({ challenge: receivedChallenge, isValid, event: eventData });
            }
        });
        
        // Timeout after 60 seconds
        setTimeout(() => {
            console.log("Timeout reached. No matching verification received.");
            jetsonRobot.removeAllListeners();
            resolve(null);
        }, 60000);
    });
    
    if (events === null) {
        console.log("\n❌ Timed out waiting for verification");
        return;
    }
    
    const { isValid, event } = events;
    if (isValid) {
        console.log("\n✅ Challenge verified successfully!");
        console.log("Verification TX:", event.transactionHash);
        console.log("Etherscan:", `https://sepolia.basescan.org/tx/${event.transactionHash}`);
    } else {
        console.log("\n❌ Challenge verification failed");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error occurred!");
        console.error(error);
        process.exit(1);
    });