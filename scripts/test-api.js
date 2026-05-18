const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          console.log('Non-JSON:', data.substring(0, 300));
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log("=== FETCHING QA RESULTS FROM LIVE SERVER ===\n");
  const data = await fetchJSON('https://lettr-news.onrender.com/api/cron/qa?secret=lettr_qa_phase4');
  
  if (!data) {
    console.log("Failed to fetch QA data. Deployment may not be ready.");
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}

main();
