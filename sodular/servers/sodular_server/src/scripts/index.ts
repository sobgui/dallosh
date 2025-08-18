/**
 * Root Scripts
 * Initialize database with default data and root user
 */

import { MongoDatabaseAdapter } from '@/lib/database/adapters/mongodb';
import { Logger, PasswordUtils } from '@/core/utils';
import { ENV } from '@/configs/env';
import { CONSTANTS } from '@/configs/constant';

interface ScriptOptions {
  isReady: boolean;
  database: MongoDatabaseAdapter;
}

/**
 * Root scripts to initialize the database
 */
export async function rootScripts({ isReady, database }: ScriptOptions): Promise<void> {
  if (!isReady || !database) {
    Logger.error('Database not ready for root scripts');
    return;
  }

  try {
    Logger.info('🚀 Running root scripts...');

    // Step 1: Create users table/collection
    const result = await createUsersTable(database);
    if (result?.value) {
      const tableUid: string = result?.value?.uid as string;
      // Step 2: Create root user
      await createRootUser(tableUid, database);

      Logger.info('✅ Root scripts completed successfully');
    }

    
  } catch (error) {
    Logger.error('❌ Root scripts failed:', error);
    throw error;
  }
}

/**
 * Create users table/collection if it doesn't exist
 */
async function createUsersTable(database: MongoDatabaseAdapter){
  try {
    Logger.info('📋 Creating users table...');

    // Check if users table already exists
    const existingTable = await database.tables.get({
      filter: { 'data.name': CONSTANTS.COLLECTIONS.USERS }
    });

    if (existingTable.value) {
      Logger.info('📋 Users table already exists, skipping creation');
      return existingTable;
    }

    // Create users table
    const result = await database.tables.create({
      data: {
        name: CONSTANTS.COLLECTIONS.USERS,
        description: 'System users collection',
        enableLogin:true,
        enableRegister:true
      },
      createdBy: 'system',
      isActive:true,
    });

    if (result.error) {
      throw new Error(`Failed to create users table: ${result.error}`);
    }
    
    Logger.info('✅ Users table created successfully');

    return result;
  } catch (error) {
    Logger.error('❌ Failed to create users table:', error);
    throw error;
  }
}

/**
 * Create root user if it doesn't exist
 */
async function createRootUser(tableUid: string, database: MongoDatabaseAdapter): Promise<void> {
  try {
    Logger.info('👤 Creating root user...');

    // Check if root user already exists
    const existingUser = await database.ref.from(tableUid).get({
      filter: { 'data.email': ENV.ROOT_EMAIL }
    });

    if (existingUser.value) {
      Logger.info('👤 Root user already exists!');

      // Update existing root user with hashed password
      // const hashedPassword = await PasswordUtils.hashPassword(ENV.ROOT_PASSWORD);
      // const updateResult = await database.ref.from(tableUid).patch(
      //   { uid: existingUser.value.uid },
      //   {
      //     data: {
      //       password: hashedPassword
      //     },
      //     updatedBy: 'system'
      //   }
      // );

      // if (updateResult.error) {
      //   throw new Error(`Failed to update root user password: ${updateResult.error}`);
      // }

      // Logger.info('✅ Root user password updated successfully');
      return;
    }

    // Create root user with hashed password
    const hashedPassword = await PasswordUtils.hashPassword(ENV.ROOT_PASSWORD);
    const result = await database.ref.from(tableUid).create({
      data: {
        email: ENV.ROOT_EMAIL,
        password: hashedPassword,
        username: ENV.ROOT_USERNAME,
        isEmailVerified: true
      },
      isActive: true,
      createdBy: 'system'
    });

    if (result.error) {
      throw new Error(`Failed to create root user: ${result.error}`);
    }

    Logger.info('✅ Root user created successfully');
    Logger.info(`📧 Root email: ${ENV.ROOT_EMAIL}`);
    Logger.info(`👤 Root username: ${ENV.ROOT_USERNAME}`);
  } catch (error) {
    Logger.error('❌ Failed to create root user:', error);
    throw error;
  }
}
