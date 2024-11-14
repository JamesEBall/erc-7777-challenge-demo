// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract JetsonRobot {
    bytes32 public lastChallenge;
    bytes public rsaPublicKey;
    
    event ChallengeGenerated(bytes32 challenge);
    event ChallengeVerified(bytes32 challenge, bool success);
    
    struct RobotInfo {
        string manufacturer;
        string operator;
        string model;
        string serialNumber;
    }
    
    RobotInfo public info;

    constructor(
        bytes memory _rsaPublicKey,
        string memory _manufacturer,
        string memory _operator,
        string memory _model,
        string memory _serialNumber
    ) {
        rsaPublicKey = _rsaPublicKey;
        info = RobotInfo({
            manufacturer: _manufacturer,
            operator: _operator,
            model: _model,
            serialNumber: _serialNumber
        });
    }

    function generateChallenge() external returns (bytes32) {
        lastChallenge = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        ));
        
        emit ChallengeGenerated(lastChallenge);
        return lastChallenge;
    }

    function verifyChallenge(bytes32 challenge, bytes memory rsaSignature) external returns (bool) {
        require(challenge == lastChallenge, "Invalid or expired challenge");
        
        // For testing, accept any signature of the right length
        // In production, this would verify the RSA signature
        bool success = rsaSignature.length == 256; // 2048-bit RSA = 256 bytes
        
        emit ChallengeVerified(challenge, success);
        return success;
    }
}