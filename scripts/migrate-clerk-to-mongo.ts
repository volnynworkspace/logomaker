/**
 * Migration Script: Clerk Users → MongoDB Users
 *
 * This script migrates existing user data from Clerk to MongoDB.
 * It fetches all unique Clerk user IDs from the Logo collection,
 * retrieves their email and credits from Clerk, creates User documents
 * in MongoDB, and updates Logo records to reference the new MongoDB user IDs.
 *
 * Prerequisites:
 * - Clerk SDK must still be installed temporarily: npm install @clerk/nextjs
 * - CLERK_SECRET_KEY must be set in .env
 * - MONGODB_URI must be set in .env
 *
 * Usage:
 *   npx tsx scripts/migrate-clerk-to-mongo.ts
 */

import { config } from 'dotenv';
config();

async function migrate() {
  // Dynamic imports to avoid issues if clerk is not installed
  const { default: Clerk } = await import('@clerk/clerk-sdk-node' as any);
  const mongoose = await import('mongoose');

  const MONGODB_URI = process.env.MONGODB_URI;
  const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

  if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
  if (!CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY not set');

  // Connect to MongoDB
  await mongoose.default.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.default.connection.db;
  if (!db) throw new Error('No database connection');

  const logosCollection = db.collection('logos');
  const usersCollection = db.collection('users');

  // Get all unique Clerk user IDs from logos
  const clerkIds: string[] = await logosCollection.distinct('userId');
  console.log(`Found ${clerkIds.length} unique user IDs in logos`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const clerkId of clerkIds) {
    // Skip Volnyn users — they don't have Clerk accounts
    if (clerkId.startsWith('volnyn_')) {
      console.log(`  Skipping Volnyn user: ${clerkId}`);
      skipped++;
      continue;
    }

    try {
      // Fetch user from Clerk
      const clerkUser = await Clerk.users.getUser(clerkId);
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      const name = clerkUser.firstName || clerkUser.username || 'User';
      const credits = (clerkUser.unsafeMetadata?.remaining as number) || 0;
      const image = clerkUser.imageUrl || '';

      if (!email) {
        console.log(`  Skipping ${clerkId}: no email found`);
        skipped++;
        continue;
      }

      // Create or update MongoDB user (upsert by email)
      const result = await usersCollection.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            email,
            name,
            image,
            googleId: `clerk_migrated_${clerkId}`, // Placeholder until they sign in with Google
            credits,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      const mongoUserId = result?._id?.toString();
      if (!mongoUserId) {
        console.log(`  Error: Could not get MongoDB ID for ${email}`);
        errors++;
        continue;
      }

      // Update all logos from this Clerk ID to the new MongoDB ID
      const updateResult = await logosCollection.updateMany(
        { userId: clerkId },
        { $set: { userId: mongoUserId } }
      );

      console.log(`  Migrated ${email}: ${updateResult.modifiedCount} logos updated, ${credits} credits`);
      migrated++;
    } catch (err: any) {
      console.error(`  Error migrating ${clerkId}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);

  await mongoose.default.disconnect();
  console.log('Done!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
