async function main() {
    const ROBOT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
    const ROBOT_PRIVATE_KEY = "YOUR_SAVED_PRIVATE_KEY";
    
    const robotContract = await ethers.getContractAt("MockRobot", ROBOT_ADDRESS);
    const robotWallet = new ethers.Wallet(ROBOT_PRIVATE_KEY);
  
    // Generate challenge
    const tx = await robotContract.generateChallenge();
    await tx.wait();
    
    // Get the challenge
    const challenge = await robotContract.generateChallenge();
    console.log("Challenge:", challenge);
  
    // Sign the challenge with the robot's private key
    const signature = await robotWallet.signMessage(ethers.utils.arrayify(challenge));
    console.log("Signature:", signature);
  
    // Verify the challenge
    const isValid = await robotContract.verifyChallenge(challenge, signature);
    console.log("Signature valid:", isValid);
  }
  
  main().catch(console.error);