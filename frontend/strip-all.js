import fs from 'fs';
import path from 'path';
import strip from 'strip-comments';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else {
      if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        try {
          const stripped = strip(content);
          
          // To clean up empty JSX expression braces {} that are left behind:
          // e.g., { \n \n } -> we can optionally remove them, but maybe it's safer to leave them or clean them up specifically if they are empty
          const cleaned = stripped.replace(/\{\s*\}/g, '');
          
          if (content !== cleaned) {
            fs.writeFileSync(fullPath, cleaned, 'utf8');
            console.log(`Stripped: ${fullPath}`);
          }
        } catch (e) {
          console.error(`Error processing ${fullPath}`, e);
        }
      }
    }
  }
}

processDirectory('./src');
console.log('Done');
