const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../assets/images/tabIcons');

const copies = [
  { src: 'home.png', dest: 'today.png' },
  { src: 'home@2x.png', dest: 'today@2x.png' },
  { src: 'home@3x.png', dest: 'today@3x.png' },
  
  { src: 'explore.png', dest: 'habits.png' },
  { src: 'explore@2x.png', dest: 'habits@2x.png' },
  { src: 'explore@3x.png', dest: 'habits@3x.png' },
  
  { src: 'explore.png', dest: 'stats.png' },
  { src: 'explore@2x.png', dest: 'stats@2x.png' },
  { src: 'explore@3x.png', dest: 'stats@3x.png' },
  
  { src: 'home.png', dest: 'profile.png' },
  { src: 'home@2x.png', dest: 'profile@2x.png' },
  { src: 'home@3x.png', dest: 'profile@3x.png' }
];

console.log('Generating tab icon copies...');
copies.forEach(({ src, dest }) => {
  const srcPath = path.join(srcDir, src);
  const destPath = path.join(srcDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.warn(`Source file not found: ${srcPath}`);
  }
});
console.log('Tab icons generation completed successfully.');
