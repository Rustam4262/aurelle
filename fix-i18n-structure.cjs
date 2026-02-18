// Script to restructure i18n JSON files
// Move owner, master, client, admin to top level

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'client', 'src', 'locales');
const files = ['en.json', 'ru.json', 'uz.json'];

files.forEach(filename => {
  const filePath = path.join(localesDir, filename);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Extract sections that should be at top level
  if (content.marketplace && content.marketplace.owner) {
    content.owner = content.marketplace.owner;
    delete content.marketplace.owner;
  }

  if (content.marketplace && content.marketplace.master) {
    content.master = content.marketplace.master;
    delete content.marketplace.master;
  }

  if (content.marketplace && content.marketplace.client) {
    content.client = content.marketplace.client;
    delete content.marketplace.client;
  }

  // Admin might be separate or inside owner
  if (content.owner && content.owner.admin) {
    // Keep admin inside owner for now, structure is correct
  }

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
  console.log(`✓ Fixed ${filename}`);
});

console.log('\nAll locale files restructured!');
