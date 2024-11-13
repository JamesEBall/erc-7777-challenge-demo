// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniversalIdentity {
    struct HardwareIdentity {
        bytes32 publicKey;            // Hardware-bound public key uniquely tied to this robot
        string manufacturer;           // Identifier for the robot's manufacturer
        string operator;               // Identifier for the robot's operator
        string model;                  // Model identifier of the robot
        string serialNumber;           // Unique serial number for the robot
        bytes32 initialHashSignature;  // Signature of the initial system state hash
        bytes32 currentHashSignature;  // Signature of the latest state hash
    }

    function getHardwareIdentity() external view returns (HardwareIdentity memory);
    function generateChallenge() external returns (bytes32);
    function verifyChallenge(bytes32 challenge, bytes memory signature) external returns (bool);
    function addRule(bytes memory rule) external;
    function removeRule(bytes memory rule) external;
    function checkCompliance(bytes memory rule) external view returns (bool);
}

contract MockRobot is IUniversalIdentity {
    bytes32 private lastChallenge;
    HardwareIdentity private hardwareIdentity;
    
    // Events for better tracking
    event ChallengeGenerated(bytes32 challenge);
    event ChallengeVerified(bytes32 challenge, bool success);

    constructor(
        bytes32 _publicKey,
        string memory _manufacturer,
        string memory _operator,
        string memory _model,
        string memory _serialNumber
    ) {
        hardwareIdentity = HardwareIdentity({
            publicKey: _publicKey,
            manufacturer: _manufacturer,
            operator: _operator,
            model: _model,
            serialNumber: _serialNumber,
            initialHashSignature: bytes32(0),
            currentHashSignature: bytes32(0)
        });
    }

    function getHardwareIdentity() external view returns (HardwareIdentity memory) {
        return hardwareIdentity;
    }

    function generateChallenge() external returns (bytes32) {
        // Create a challenge using block data and sender address
        lastChallenge = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        ));
        
        emit ChallengeGenerated(lastChallenge);
        return lastChallenge;
    }

    function verifyChallenge(bytes32 challenge, bytes memory signature) external returns (bool) {
        require(challenge == lastChallenge, "Invalid or expired challenge");
        
        // Recover signer from signature
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", challenge));
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        address signer = ecrecover(messageHash, v, r, s);
        
        // Convert public key from hardware identity to address for comparison
        address expectedSigner = address(uint160(uint256(hardwareIdentity.publicKey)));
        
        bool success = (signer == expectedSigner);
        emit ChallengeVerified(challenge, success);
        
        return success;
    }

    // Simple rule management implementations for the mock
    mapping(bytes32 => bool) private rules;

    function addRule(bytes memory rule) external {
        rules[keccak256(rule)] = true;
    }

    function removeRule(bytes memory rule) external {
        rules[keccak256(rule)] = false;
    }

    function checkCompliance(bytes memory rule) external view returns (bool) {
        return rules[keccak256(rule)];
    }

    // Helper function to get the current challenge (for testing)
    function getCurrentChallenge() external view returns (bytes32) {
        return lastChallenge;
    }
}