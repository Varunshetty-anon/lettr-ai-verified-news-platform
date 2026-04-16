const BASE = 'http://localhost:3000';

async function test() {
  console.log('========================================');
  console.log('  LETTR Full System Test');
  console.log('========================================\n');

  // 1. BOT SEED TEST
  console.log('🤖 BOT SEED TEST');
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${BASE}/api/cron/seed-bots`);
    const d = await r.json();
    console.log(`  ${i+1}. [${r.status}] ${d.post?.headline?.substring(0, 55) || d.message}`);
  }

  // 2. FEED TEST
  console.log('\n📰 FEED TEST');
  const f = await fetch(`${BASE}/api/posts`);
  const fd = await f.json();
  console.log(`  Total posts: ${fd.posts.length}`);
  fd.posts.slice(0, 4).forEach(p => {
    console.log(`  [${p.factScore}] ${p.author?.name} (${p.category}) | ${p.headline?.substring(0, 50)}`);
  });

  // 3. LIKE TEST
  const pid = fd.posts[0]._id;
  console.log('\n❤️ LIKE TEST');
  const lk = await fetch(`${BASE}/api/user/interact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@lettr.ai', postId: pid, action: 'like' })
  });
  console.log(`  Like: ${lk.status}`, await lk.json());

  // 4. PREFERENCES TEST
  console.log('\n⚙️ PREFERENCES TEST');
  const pr = await fetch(`${BASE}/api/user/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@lettr.ai', preferences: ['Technology', 'AI & Tech', 'Science'] })
  });
  console.log(`  Save: ${pr.status}`, await pr.json());

  const gr = await fetch(`${BASE}/api/user/preferences?email=demo@lettr.ai`);
  const gd = await gr.json();
  console.log(`  Get:  prefs=${JSON.stringify(gd.preferences)}, likes=${gd.likedPosts?.length}, views=${gd.viewedPosts?.length}`);

  // 5. PERSONALIZED FEED TEST
  console.log('\n🧠 PERSONALIZED FEED TEST');
  const pf = await fetch(`${BASE}/api/posts?email=demo@lettr.ai`);
  const pfd = await pf.json();
  console.log(`  Posts: ${pfd.posts.length}`);
  pfd.posts.slice(0, 3).forEach(p => {
    console.log(`  [${p.factScore}] ${p.category} | ${p.headline?.substring(0, 50)} ${p.isLiked ? '❤️' : ''}`);
  });

  // 6. POST DETAIL TEST
  console.log('\n🔍 POST DETAIL TEST');
  const dt = await fetch(`${BASE}/api/posts/${pid}`);
  const dd = await dt.json();
  console.log(`  Headline: ${dd.post?.headline?.substring(0, 55)}`);
  console.log(`  Score: ${dd.post?.factScore}, Author: ${dd.post?.author?.name}, Role: ${dd.post?.author?.role}`);
  console.log(`  Related: ${dd.related?.length} articles`);

  // 7. EXPLORE CATEGORY TEST
  console.log('\n🔎 EXPLORE CATEGORY TEST');
  const ex = await fetch(`${BASE}/api/posts?category=Technology&sort=score`);
  const ed = await ex.json();
  console.log(`  Technology posts: ${ed.posts.length}`);
  ed.posts.slice(0, 2).forEach(p => console.log(`  [${p.factScore}] ${p.headline?.substring(0, 50)}`));

  const ex2 = await fetch(`${BASE}/api/posts?category=World`);
  const ed2 = await ex2.json();
  console.log(`  World posts: ${ed2.posts.length}`);

  // 8. PUBLISH AUTH TEST
  console.log('\n🔐 PUBLISH AUTH TEST');
  const pu = await fetch(`${BASE}/api/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headline: 'Test article', description: 'Test description', authorEmail: 'demo@lettr.ai' })
  });
  const pd = await pu.json();
  console.log(`  Unverified user: [${pu.status}] ${pd.error || pd.message || 'published'}`);

  // 9. AI FACT CHECK TEST
  console.log('\n🧠 AI FACT CHECK (FALSE CLAIM)');
  const fk = await fetch(`${BASE}/api/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ headline: 'Aliens land in NYC', description: 'NASA confirms aliens landed in Times Square today.', authorEmail: 'nonexistent@test.com' })
  });
  const fkd = await fk.json();
  console.log(`  Status: [${fk.status}] ${fkd.error || fkd.reasoning || fkd.message}`);

  console.log('\n========================================');
  console.log('  Test Complete');
  console.log('========================================');
}

test().catch(e => console.error('Test failed:', e.message));
