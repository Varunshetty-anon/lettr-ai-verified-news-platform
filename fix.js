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
  if (content.includes('fetch(')) {
    let changed = false;
    
    if (content.includes('fetch("/api/') || content.includes("fetch('/api/") || content.includes('fetch(`/api/')) {
      if (!content.includes('const API_URL')) {
        if (content.includes('export default function')) {
          content = content.replace(/export default function/, 'const API_URL = process.env.NEXT_PUBLIC_API_URL || "";\n\nexport default function');
        } else if (content.includes('export function')) {
          content = content.replace(/export function/, 'const API_URL = process.env.NEXT_PUBLIC_API_URL || "";\n\nexport function');
        }
      }
      content = content.replace(/fetch\('\/api\//g, 'fetch(`${API_URL}/api/');
      content = content.replace(/fetch\("\/api\//g, 'fetch(`${API_URL}/api/');
      content = content.replace(/fetch\(`\/api\//g, 'fetch(`${API_URL}/api/');
      changed = true;
    }
    
    if (file.includes('page.tsx') && content.includes('const apiUrl = ')) {
       content = content.replace(/const apiUrl = (.*)`\/api\/posts/, 'const apiUrl = $1`${API_URL}/api/posts');
       changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  }
}
