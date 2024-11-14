import os
import json
import platform
import time
from web3 import Web3
from eth_account import Account
from pathlib import Path
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from eth_account.messages import encode_defunct

# Use mock on non-Linux systems
if platform.system() != 'Linux':
    import mock_tegrasign as tegrasign
else:
    from . import tegrasign

class JetsonVerifier:
    def __init__(self):
        # Load or create config
        config_path = os.path.join(os.path.dirname(__file__), 'config.json')
        if os.path.exists(config_path):
            with open(config_path) as f:
                self.config = json.load(f)
        else:
            raise Exception("No config file found. Please deploy robot first.")
            
        # Initialize Web3 with better error handling
        self.w3 = Web3(Web3.HTTPProvider(self.config['rpcUrl']))
        if not self.w3.is_connected():
            raise Exception("Failed to connect to Base Sepolia")
        
        # Initialize account with robot's private key
        if not self.config['robotPrivateKey'].startswith('0x'):
            self.config['robotPrivateKey'] = '0x' + self.config['robotPrivateKey']
        self.account = Account.from_key(self.config['robotPrivateKey'])
        
        # Verify connection and balance
        balance = self.w3.eth.get_balance(self.account.address)
        print(f"\n🏦 Account Info:")
        print(f"Address: {self.account.address}")
        print(f"Balance: {self.w3.from_wei(balance, 'ether')} BASE")
        print(f"Connected to network: {self.w3.eth.chain_id}")
        
        if balance == 0:
            print("⚠️  Warning: Account balance is 0. Please fund account with BASE tokens")
        
        # Initialize HSM
        self.hsm = tegrasign.init_secure_element()
        
        # Deploy contract if needed
        if 'robotAddress' not in self.config:
            self.deploy_contract()
        
        # Load contract
        self.contract = self.w3.eth.contract(
            address=self.config['robotAddress'],
            abi=self.load_contract_abi()
        )
        
        print(f"Starting challenge monitor...")
        print(f"Monitoring contract: {self.config['robotAddress']}")
        print(f"Network: {self.w3.eth.chain_id}")
        
        # Initialize last_block to current block
        self.last_block = self.w3.eth.block_number

    def deploy_contract(self):
        """Deploy the JetsonRobot contract using Hardhat artifacts"""
        try:
            print("\n🚀 Deploying JetsonRobot contract...")
            
            # Load contract artifacts from Hardhat
            artifacts_path = os.path.join(
                os.path.dirname(__file__), 
                '../../artifacts/contracts/JetsonRobot.sol/JetsonRobot.json'
            )
            with open(artifacts_path) as f:
                contract_json = json.load(f)
            
            # Get RSA public key from HSM
            rsa_public_key = self.hsm.get_public_key()
            
            # Create contract instance
            JetsonRobot = self.w3.eth.contract(
                abi=contract_json['abi'],
                bytecode=contract_json['bytecode']
            )
            
            # Build constructor transaction
            tx = JetsonRobot.constructor(
                rsa_public_key,
                "NVIDIA",              # manufacturer
                "Test Operator",       # operator
                "Jetson AGX Orin",     # model
                "12345"                # serialNumber
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 2000000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            # Sign and send transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.config['privateKey'])
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            # Wait for deployment
            tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            contract_address = tx_receipt['contractAddress']
            
            # Save address and network to config
            self.config['robotAddress'] = contract_address
            self.config['network'] = 'base-sepolia'  # Add network info
            with open(os.path.join(os.path.dirname(__file__), 'config.json'), 'w') as f:
                json.dump(self.config, f, indent=2)
            
            print(f"✅ Contract deployed to: {contract_address}")
            return contract_address
            
        except Exception as e:
            print(f"❌ Error deploying contract: {str(e)}")
            raise
    
    def load_contract_abi(self):
        # Update path to use JetsonRobot instead of MockRobot
        artifacts_path = os.path.join(
            os.path.dirname(__file__), 
            '../../artifacts/contracts/JetsonRobot.sol/JetsonRobot.json'
        )
        with open(artifacts_path) as f:
            contract_json = json.load(f)
            return contract_json['abi']
    
    def monitor_challenges(self):
        """Monitor and respond to challenges"""
        print("Starting challenge monitor...")
        print(f"Monitoring contract: {self.config['robotAddress']}")
        print(f"Network: {self.w3.eth.chain_id}")
        
        while True:
            try:
                current_block = self.w3.eth.block_number
                print(f"Checking block {current_block}...")
                
                if current_block > self.last_block:
                    event = self.contract.events.ChallengeGenerated
                    event_filter = {
                        'fromBlock': self.last_block + 1,
                        'toBlock': current_block,
                        'address': self.config['robotAddress']
                    }
                    
                    try:
                        logs = self.w3.eth.get_logs(event_filter)
                        if logs:
                            print(f"Found {len(logs)} events")
                            print(f"Raw log data: {logs}")
                            try:
                                processed_logs = [event.process_log(log) for log in logs]
                                print(f"Processed logs: {processed_logs}")
                                
                                for log in processed_logs:
                                    # Get challenge bytes from args
                                    challenge = log['args']['challenge']
                                    print(f"\nReceived challenge: {challenge.hex()}")
                                    
                                    # Sign the challenge
                                    signature = self.sign_challenge(challenge)
                                    print(f"Generated signature: {signature.hex()}")
                                    
                                    # Submit verification with both challenge and signature
                                    self.verify_challenge(challenge, signature)
                            except Exception as e:
                                print(f"Error processing log: {str(e)}")
                                print(f"Log that caused error: {logs[0]}")
                        else:
                            print("No new events found")
                    except Exception as e:
                        print(f"Error getting logs: {str(e)}")
                    
                    self.last_block = current_block
                
                time.sleep(1)
            except Exception as e:
                print(f"Monitor error: {str(e)}")
                time.sleep(1)
    
    def sign_challenge(self, challenge):
        """Sign a challenge using software key derived from HSM"""
        # WARNING: This reduces security by not using HSM directly
        try:
            print(f"\n✍️  Signing challenge: {challenge.hex()}")
            
            # Generate deterministic private key from HSM signature
            hsm_signature = self.hsm.sign(
                challenge,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            # Create Ethereum private key from HSM signature
            eth_private_key = hsm_signature[:32]  # Use first 32 bytes
            eth_account = Account.from_key(eth_private_key)
            
            # Sign with Ethereum key
            message = encode_defunct(challenge)
            eth_signature = eth_account.sign_message(message)
            
            return eth_signature.signature
            
        except Exception as e:
            print(f"❌ Error signing challenge: {str(e)}")
            raise

    def verify_challenge(self, challenge, signature):
        try:
            print(f"\n📤 Submitting verification to contract...")
            print(f"Verifying from address: {self.account.address}")
            
            # Check balance before sending
            balance = self.w3.eth.get_balance(self.account.address)
            print(f"Account balance: {self.w3.from_wei(balance, 'ether')} ETH")
            
            # Make sure we're using the robot's account
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            verify_tx = self.contract.functions.verifyChallenge(
                challenge,
                signature
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 200000,
                'maxFeePerGas': self.w3.eth.gas_price,
                'maxPriorityFeePerGas': self.w3.eth.gas_price
            })
            
            # Sign with robot's account
            signed_tx = self.w3.eth.account.sign_transaction(verify_tx, self.config['robotPrivateKey'])
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            print(f"Verification TX sent: {tx_hash.hex()}")
            print(f"Etherscan: https://sepolia.basescan.org/tx/{tx_hash.hex()}")
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"✅ Verification confirmed in block {receipt.blockNumber}")
            
            return tx_hash.hex()

        except Exception as e:
            print(f"❌ Error verifying challenge: {str(e)}")
            raise

def main():
    verifier = JetsonVerifier()
    verifier.monitor_challenges()

if __name__ == "__main__":
    main()
