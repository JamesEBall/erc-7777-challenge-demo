import unittest
from .verifier import JetsonVerifier
from eth_account import Account
import os

class TestVerifier(unittest.TestCase):
    def setUp(self):
        self.verifier = JetsonVerifier()
    
    def test_challenge_signing(self):
        # Create test challenge
        challenge = os.urandom(32)
        
        # Sign challenge
        signature = self.verifier.sign_challenge(challenge)
        
        # Verify we got a valid signature back
        self.assertIsNotNone(signature)
        self.assertTrue(len(signature) > 0)

if __name__ == '__main__':
    unittest.main()