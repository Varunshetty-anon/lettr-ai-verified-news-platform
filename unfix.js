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
  
  if (content.includes('${API_URL}')) {
    content = content.replace(/\$\{API_URL\}/g, '');
    changed = true;
  }
  if (content.includes('const API_URL = process.env.NEXT_PUBLIC_API_URL || "";')) {
    content = content.replace(/const API_URL = process.env\.NEXT_PUBLIC_API_URL \|\| "";\s*/g, '');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Removed API_URL from ' + file);
  }
}
