const fs = require('fs');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      files.push(name);
    }
  }
  return files;
}

const files = getFiles('./app');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.match(/fetch\(`\$\{API_URL\}\/api\/(.*?)'/)) {
    content = content.replace(/fetch\(`\$\{API_URL\}\/api\/(.*?)'/g, 'fetch(`${API_URL}/api/$1`');
    changed = true;
  }
  
  if (content.match(/fetch\(`\$\{API_URL\}\/api\/(.*?)"/)) {
    content = content.replace(/fetch\(`\$\{API_URL\}\/api\/(.*?)"/g, 'fetch(`${API_URL}/api/$1`');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed quotes in ' + file);
  }
}
