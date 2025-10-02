/**
 * Version Management Script
 * Automatically updates version based on Git commits and timestamp
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitCommitCount() {
  try {
    const count = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    return parseInt(count) || 0;
  } catch (error) {
    console.warn('Git not available, using timestamp-based version');
    return 0;
  }
}

function getGitCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    return '';
  }
}

function generateVersion() {
  const commitCount = getGitCommitCount();
  const commitHash = getGitCommitHash();
  const date = new Date();

  if (commitCount > 0) {
    // Git-based version: v1.{commitCount}.{build}
    const build = date.getDate().toString().padStart(2, '0');
    const version = `v1.${commitCount}.${build}`;
    return commitHash ? `${version}-${commitHash}` : version;
  } else {
    // Timestamp-based version
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `v1.0.${year}${month}${day}.${hour}${minute}`;
  }
}

function updateVersionInFiles(version) {
  const files = [
    {
      path: path.join(__dirname, '..', 'public', 'index.html'),
      pattern: /<span class="app-version" id="app-version">v[\d\.\-\w]+<\/span>/,
      replacement: `<span class="app-version" id="app-version">${version}</span>`
    },
    {
      path: path.join(__dirname, '..', 'public', 'js', 'version.js'),
      pattern: /window\.APP_VERSION = ['"`]v[\d\.\-\w]+['"`];?/,
      replacement: `window.APP_VERSION = '${version}';`
    }
  ];

  files.forEach(file => {
    if (fs.existsSync(file.path)) {
      try {
        let content = fs.readFileSync(file.path, 'utf8');
        if (file.pattern.test(content)) {
          content = content.replace(file.pattern, file.replacement);
          fs.writeFileSync(file.path, content, 'utf8');
          console.log(`✅ Updated version in ${path.basename(file.path)}`);
        } else {
          console.log(`⚠️ Pattern not found in ${path.basename(file.path)}`);
        }
      } catch (error) {
        console.error(`❌ Error updating ${file.path}:`, error.message);
      }
    }
  });
}

function createVersionFile(version) {
  const versionFilePath = path.join(__dirname, '..', 'public', 'js', 'version.js');
  const content = `// Auto-generated version file
// Updated: ${new Date().toISOString()}
window.APP_VERSION = '${version}';

// Version update notification
if (typeof window !== 'undefined') {
  console.log('🚀 App Version:', window.APP_VERSION);
}
`;

  fs.writeFileSync(versionFilePath, content, 'utf8');
  console.log(`📝 Created version file: ${version}`);
}

function main() {
  const version = generateVersion();
  console.log(`🔄 Generating version: ${version}`);

  // Create version file
  createVersionFile(version);

  // Update version in HTML files
  updateVersionInFiles(version);

  console.log(`✅ Version management complete: ${version}`);
  return version;
}

// Export for programmatic use
module.exports = { generateVersion, updateVersionInFiles, createVersionFile };

// Run if called directly
if (require.main === module) {
  main();
}