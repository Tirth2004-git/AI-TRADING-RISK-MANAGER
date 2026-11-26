import { connectDB, disconnectDB } from '../src/config/db.js';
import { generateDemoData } from '../src/services/demo.service.js';

async function runSeed() {
  await connectDB();
  const result = await generateDemoData();
  if (result.alreadySeeded) {
    console.log('Demo data already exists; skipping duplicate seed.');
  } else {
    console.log('Demo data seeded successfully:', result.created);
  }
  await disconnectDB();
}

runSeed().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDB();
  process.exit(1);
});
