// scripts/deploy.js
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // Generate a new keypair for the mock robot
  const robotWallet = ethers.Wallet.createRandom();
  console.log("Generated robot wallet address:", robotWallet.address);

  // Hash the public key to get a bytes32 value
  const publicKeyBytes32 = ethers.keccak256(
    ethers.toUtf8Bytes(robotWallet.address)
  );
  
  console.log("Public key bytes32:", publicKeyBytes32);

  const MockRobot = await ethers.getContractFactory("MockRobot");
  const robot = await MockRobot.deploy(
    publicKeyBytes32,
    "RobotCorp",
    "TestOperator",
    "TestBot-1",
    "SN123456"
  );

  await robot.waitForDeployment();
  const robotAddress = await robot.getAddress();

  console.log("MockRobot deployed to:", robotAddress);
  console.log("Robot private key (save this):", robotWallet.privateKey);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });