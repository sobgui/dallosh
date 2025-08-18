#!/usr/bin/env ts-node

import * as readline from 'readline';
import { JWTUtils } from '../core/utils';
import { env } from '../configs/env';

interface TokenPayload {
  uid: string;
  email: string;
  username?: string;
  iat?: number;
  exp?: number;
}

class JWTCLI {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }

  async run() {
    try {
      console.log('🔐 JWT Token Generator CLI');
      console.log('==========================\n');

      // Get required fields
      const uid = await this.question('Enter User ID (required): ');
      if (!uid.trim()) {
        console.error('❌ User ID is required!');
        this.rl.close();
        return;
      }

      const email = await this.question('Enter Email (required): ');
      if (!email.trim()) {
        console.error('❌ Email is required!');
        this.rl.close();
        return;
      }

      // Get optional fields
      const username = await this.question('Enter Username (optional, press Enter to skip): ');
      const expiration = await this.question('Enter Expiration (optional, e.g., "1h", "7d", "30d", press Enter for no expiration): ');

      // Build payload
      const payload: TokenPayload = {
        uid: uid.trim(),
        email: email.trim()
      };

      if (username.trim()) {
        payload.username = username.trim();
      }

      // Generate token
      const expiresIn = expiration.trim() || false;
      const token = JWTUtils.signToken(payload, expiresIn);

      // Display results
      console.log('\n✅ JWT Token Generated Successfully!');
      console.log('=====================================\n');
      
      console.log('📋 Payload:');
      console.log(JSON.stringify(payload, null, 2));
      
      console.log('\n🔑 JWT Token:');
      console.log(token);
      
      if (expiresIn !== false) {
        console.log(`\n⏰ Expires in: ${expiresIn}`);
      } else {
        console.log('\n⏰ Expiration: Never (token will not expire)');
      }

      // Verify the token
      try {
        const decoded = JWTUtils.verifyToken(token);
        console.log('\n✅ Token verification successful!');
        console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
      } catch (error) {
        console.log('\n❌ Token verification failed:', error);
      }

    } catch (error) {
      console.error('❌ Error generating JWT token:', error);
    } finally {
      this.rl.close();
    }
  }
}

// Run the CLI
const cli = new JWTCLI();
cli.run().catch(console.error);
