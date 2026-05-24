const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  console.log('=== LETTR DB (lettr) ===');
  const lettrUsers = await client.db('lettr').collection('users')
    .find({}).project({ email: 1, isVerifiedAuthor: 1, role: 1, name: 1 }).toArray();
  console.log(`Users: ${lettrUsers.length}`);
  lettrUsers.forEach(u => console.log(`  ${u.name} | ${u.email} | role=${u.role} | verified=${u.isVerifiedAuthor}`));

  const lettrPosts = await client.db('lettr').collection('posts').countDocuments();
  console.log(`Posts: ${lettrPosts}\n`);

  console.log('=== TEST DB (test) ===');
  const testUsers = await client.db('test').collection('users')
    .find({}).project({ email: 1, isVerifiedAuthor: 1, role: 1, name: 1 }).toArray();
  console.log(`Users: ${testUsers.length}`);
  testUsers.forEach(u => console.log(`  ${u.name} | ${u.email} | role=${u.role} | verified=${u.isVerifiedAuthor}`));

  const testPosts = await client.db('test').collection('posts').countDocuments();
  console.log(`Posts: ${testPosts}\n`);

  // Check what's missing in lettr
  const lettrEmails = new Set(lettrUsers.map(u => u.email));
  const missing = testUsers.filter(u => !lettrEmails.has(u.email));
  if (missing.length > 0) {
    console.log('=== MISSING IN LETTR (exist in test but not lettr) ===');
    missing.forEach(u => console.log(`  ❌ ${u.name} | ${u.email} | role=${u.role} | verified=${u.isVerifiedAuthor}`));
  } else {
    console.log('✅ All test users exist in lettr');
  }

  await client.close();
})();
