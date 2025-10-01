#!/usr/bin/env tsx

import { seedService } from '../services/seedService';
import { config } from '../utils/config';

async function main() {
  console.log('🌱 Starting development data seeding...');

  if (config.NODE_ENV === 'production') {
    console.error('❌ Cannot run seeding in production environment');
    process.exit(1);
  }

  if (!config.DEV_MODE_SEED_ENABLED) {
    console.error('❌ Dev mode seeding is not enabled. Set DEV_MODE_SEED_ENABLED=true');
    process.exit(1);
  }

  try {
    const startTime = Date.now();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const resetFirst = args.includes('--reset');
    const userCount = parseInt(args.find(arg => arg.startsWith('--users='))?.split('=')[1] || '30');
    const traitPairs = parseInt(args.find(arg => arg.startsWith('--traits='))?.split('=')[1] || '50');
    const photosPerUser = parseInt(args.find(arg => arg.startsWith('--photos='))?.split('=')[1] || '4');
    const quizSessions = parseInt(args.find(arg => arg.startsWith('--quizzes='))?.split('=')[1] || '50');

    console.log('📋 Seeding options:');
    console.log(`  - Reset first: ${resetFirst}`);
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Trait pairs: ${traitPairs}`);
    console.log(`  - Photos per user: ${photosPerUser}`);
    console.log(`  - Quiz sessions: ${quizSessions}`);

    const result = await seedService.runSeed({
      userCount,
      traitPairs,
      photosPerUser,
      quizSessions,
      resetFirst
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('✅ Seeding completed successfully!');
    console.log('📊 Results:');
    console.log(`  - Users created: ${result.stats.usersCreated}`);
    console.log(`  - Photos created: ${result.stats.photosCreated}`);
    console.log(`  - Trait pairs created: ${result.stats.traitPairsCreated}`);
    console.log(`  - Quiz sessions created: ${result.stats.quizSessionsCreated}`);
    console.log(`  - Quiz items created: ${result.stats.quizItemsCreated}`);
    console.log(`  - Affinities created: ${result.stats.affinitiesCreated}`);
    console.log(`  - Total time: ${duration}ms`);
    console.log(`  - Seed run ID: ${result.seedRunId}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Show usage if help requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: pnpm seed:dev [options]

Options:
  --reset                Reset all data before seeding
  --users=<number>       Number of users to create (default: 30)
  --traits=<number>      Number of trait pairs to create (default: 50)
  --photos=<number>      Number of photos per user (default: 4)
  --quizzes=<number>     Number of quiz sessions to create (default: 50)
  --help, -h             Show this help message

Examples:
  pnpm seed:dev
  pnpm seed:dev --reset --users=50
  pnpm seed:dev --users=20 --photos=3 --quizzes=30
`);
  process.exit(0);
}

main();