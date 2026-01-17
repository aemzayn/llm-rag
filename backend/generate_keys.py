#!/usr/bin/env python3
"""
Generate secret keys for the application.
Run this script to generate SECRET_KEY and ENCRYPTION_KEY for .env file.
"""

import secrets
from cryptography.fernet import Fernet

def generate_secret_key(length: int = 32) -> str:
    """Generate a random secret key for JWT"""
    return secrets.token_urlsafe(length)

def generate_encryption_key() -> str:
    """Generate a Fernet encryption key for API keys"""
    return Fernet.generate_key().decode()

if __name__ == "__main__":
    print("=" * 60)
    print("Generated Keys for .env file")
    print("=" * 60)
    print()
    print("SECRET_KEY (for JWT authentication):")
    print(generate_secret_key())
    print()
    print("ENCRYPTION_KEY (for API key encryption):")
    print(generate_encryption_key())
    print()
    print("=" * 60)
    print("Copy these values to your .env file")
    print("=" * 60)
