// structured-convert-to-stickers.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

// Configuration
const sourceDir = path.join(process.cwd(), 'src/app/games/jok-duel/images');
const outputDir = path.join(process.cwd(), 'src/app/games/jok-duel/optimized-images');

// Sticker conversion settings
const specs = {
  format: 'png',
  quality: 80,
  compressionLevel: 4,
  maxDimension: 512
};

// Supported image formats
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// Ensure directory exists (recursive)
const ensureDir = async (dirPath) => {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

// Process a single file
const processFile = async (inputPath, outputPath, relativePath) => {
  const ext = path.extname(inputPath).toLowerCase();
  
  // Convert images to sticker format
  if (imageExtensions.has(ext)) {
    try {
      await sharp(inputPath)
        .resize({
          width: specs.maxDimension,
          height: specs.maxDimension,
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({
          quality: specs.quality,
          compressionLevel: specs.compressionLevel,
          adaptiveFiltering: true
        })
        .toFile(outputPath);
      
      console.log(`🖼️  Converted: ${relativePath}`);
      return { type: 'image', action: 'converted' };
    } catch (err) {
      console.error(`❌ Failed to convert ${relativePath}: ${err.message}`);
      return { type: 'image', action: 'failed' };
    }
  } 
  // Copy non-image files as-is
  else {
    await copyFile(inputPath, outputPath);
    console.log(`📄 Copied: ${relativePath}`);
    return { type: 'non-image', action: 'copied' };
  }
};

// Recursively process directory structure
const processDirectory = async (currentDir, relativePath = '') => {
  const entries = await readdir(currentDir, { withFileTypes: true });
  let stats = {
    imagesConverted: 0,
    imagesFailed: 0,
    filesCopied: 0
  };

  for (const entry of entries) {
    const entryRelativePath = path.join(relativePath, entry.name);
    const sourcePath = path.join(currentDir, entry.name);
    const destPath = path.join(outputDir, entryRelativePath);

    if (entry.isDirectory()) {
      // Create mirror directory in output
      await ensureDir(destPath);
      
      // Process subdirectory recursively
      const subStats = await processDirectory(sourcePath, entryRelativePath);
      stats.imagesConverted += subStats.imagesConverted;
      stats.imagesFailed += subStats.imagesFailed;
      stats.filesCopied += subStats.filesCopied;
    } else {
      // Ensure destination directory exists
      await ensureDir(path.dirname(destPath));
      
      // Process the file
      const result = await processFile(sourcePath, destPath, entryRelativePath);
      
      // Update statistics
      if (result.type === 'image') {
        result.action === 'converted' ? stats.imagesConverted++ : stats.imagesFailed++;
      } else {
        stats.filesCopied++;
      }
    }
  }

  return stats;
};

// Main function
const main = async () => {
  console.log('🏁 Starting sticker conversion...');
  console.log(`📂 Source: ${sourceDir}`);
  console.log(`🎯 Destination: ${outputDir}`);
  console.log('⚙️  Settings:', JSON.stringify(specs, null, 2));

  try {
    const startTime = Date.now();
    await ensureDir(outputDir);
    
    const { imagesConverted, imagesFailed, filesCopied } = await processDirectory(sourceDir);
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n📊 Conversion Summary:');
    console.log(`✅ Images converted: ${imagesConverted}`);
    console.log(`❌ Images failed: ${imagesFailed}`);
    console.log(`📄 Files copied: ${filesCopied}`);
    console.log(`⏱️  Time taken: ${processingTime}s`);
    console.log(`📁 Output structure mirrored in: ${outputDir}`);

    if (imagesFailed > 0) {
      console.log('\n💡 Tip: Check failed images - they may be corrupted or unsupported formats');
    }
  } catch (err) {
    console.error('💥 Critical error:', err);
    process.exit(1);
  }
};

// Run the script
main();