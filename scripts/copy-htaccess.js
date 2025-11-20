const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', '.htaccess');
const dest = path.join(__dirname, '..', 'out', '.htaccess');

try {
  if (!fs.existsSync(path.dirname(dest))) {
    console.log('out directory does not exist yet. Run "npm run build" first.');
    process.exit(0);
  }
  
  fs.copyFileSync(source, dest);
  console.log('✓ .htaccess copied to out/.htaccess');
} catch (error) {
  console.error('Error copying .htaccess:', error.message);
  process.exit(1);
}

