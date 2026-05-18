const https = require('https');

https.get('https://lettr-news.onrender.com/api/cron/seed-bots', (res) => {
  console.log('STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('BODY:', data));
});
