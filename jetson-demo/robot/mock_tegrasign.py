from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from eth_account.messages import encode_defunct
import os

class MockSecureElement:
    def __init__(self):
        # Generate a test private key (in production this would be in hardware)
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
    
    def sign(self, message, padding_algo, hash_algo):
        # First get the RSA signature
        rsa_sig = self.private_key.sign(
            message,
            padding_algo,
            hash_algo
        )
        
        # Convert RSA signature to Ethereum format (r, s, v)
        # Ensure we have enough bytes for r and s
        if len(rsa_sig) < 64:
            rsa_sig = rsa_sig.rjust(64, b'\0')
            
        r = rsa_sig[:32]
        s = rsa_sig[32:64]
        v = bytes([27])  # Standard v value for Ethereum
        
        # Combine into 65-byte Ethereum signature
        eth_sig = r + s + v
        
        return eth_sig
    
    def get_public_key(self):
        # Convert RSA public key to Ethereum address format
        pub_key = self.private_key.public_key()
        pub_bytes = pub_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        # Take the last 20 bytes for Ethereum address format
        return pub_bytes[-20:]

def init_secure_element():
    return MockSecureElement()