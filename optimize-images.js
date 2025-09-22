// optimize-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const sourceDir = path.join(process.cwd(), 'images');
const targetDir = path.join(process.cwd(), 'images-optimized');
const format = 'webp'; // Output format
const quality = 80; // WebP quality

// Function to create directory if it doesn't exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Recursively process files in directories
const processDirectory = async (directory, targetBase, relativePath = '') => {
  // Make sure the directory exists before trying to read it
  if (!fs.existsSync(directory)) {
    console.error(`Directory does not exist: ${directory}`);
    return { imageCount: 0, otherCount: 0 };
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  let imageCount = 0;
  let otherCount = 0;

  for (const entry of entries) {
    const entryName = entry.name;
    const sourcePath = path.join(directory, entryName);

    // Get relative path from source directory
    const entryRelativePath = path.join(relativePath, entryName);

    if (entry.isDirectory()) {
      // Create corresponding directory in target
      const nestedTargetDir = path.join(targetBase, relativePath, entryName);
      ensureDirectoryExists(nestedTargetDir);

      // Process the subdirectory
      const result = await processDirectory(sourcePath, targetBase, entryRelativePath);
      imageCount += result.imageCount;
      otherCount += result.otherCount;
      console.log(
        `Processed subdirectory: ${entryRelativePath} (${result.imageCount} images, ${result.otherCount} other files)`
      );
    } else {
      const fileExt = path.extname(entryName).toLowerCase();
      const fileNameWithoutExt = path.parse(entryName).name;

      // Check if this is a raster image we should optimize
      if (fileExt.match(/\.(png|jpe?g|webp|gif)$/i)) {
        // For all image types, convert to WebP (unless already a WebP with same name pattern)
        const outputRelativePath = path.join(relativePath, `${fileNameWithoutExt}.${format}`);
        const outputPath = path.join(targetBase, outputRelativePath);

        // Ensure the target directory exists
        const outputDir = path.dirname(outputPath);
        ensureDirectoryExists(outputDir);

        // If it's already a WebP file with the exact same name we want to create,
        // simply copy it instead of re-processing
        if (fileExt === '.webp' && entryName === `${fileNameWithoutExt}.${format}`) {
          try {
            fs.copyFileSync(sourcePath, outputPath);
            console.log(`Copied existing WebP: ${entryRelativePath}`);
            imageCount++;
          } catch (error) {
            console.error(`Error copying ${entryRelativePath}: ${error.message}`);
          }
        } else {
          // Process and optimize the image
          try {
            // Get file size before optimization
            const stats = fs.statSync(sourcePath);
            const fileSizeInMB = stats.size / (1024 * 1024);

            // Optimize the image
            await sharp(sourcePath).webp({ quality }).toFile(outputPath);

            // Get file size after optimization
            const optimizedStats = fs.statSync(outputPath);
            const optimizedSizeInMB = optimizedStats.size / (1024 * 1024);
            const savingsPercent = ((1 - optimizedSizeInMB / fileSizeInMB) * 100).toFixed(1);

            console.log(
              `Processed ${entryRelativePath} (${fileSizeInMB.toFixed(2)} MB → ${optimizedSizeInMB.toFixed(
                2
              )} MB, ${savingsPercent}% savings)`
            );

            imageCount++;
          } catch (error) {
            console.error(`Error processing ${entryRelativePath}: ${error.message}`);
          }
        }
      } else {
        // Copy non-image files (like SVG, videos, etc.) to maintain directory structure
        const outputPath = path.join(targetBase, relativePath, entryName);
        try {
          fs.copyFileSync(sourcePath, outputPath);
          console.log(`Copied non-raster file: ${entryRelativePath}`);
          otherCount++;
        } catch (error) {
          console.error(`Error copying ${entryRelativePath}: ${error.message}`);
        }
      }
    }
  }

  return { imageCount, otherCount };
};

// Main function
const optimizeImages = async () => {
  try {
    console.log(`Starting image optimization from ${sourceDir} to ${targetDir}`);
    console.log(`Converting raster images to ${format} format with quality ${quality}`);
    console.log(`Other file types will be copied as-is`);

    // Create target directory
    ensureDirectoryExists(targetDir);

    // Process all files
    const startTime = Date.now();
    const result = await processDirectory(sourceDir, targetDir);
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n========== Optimization Summary ==========`);
    console.log(`Raster images processed: ${result.imageCount}`);
    console.log(`Other files copied: ${result.otherCount}`);
    console.log(`Total files processed: ${result.imageCount + result.otherCount}`);
    console.log(`Processing time: ${processingTime} seconds`);
    console.log(`Source directory: ${sourceDir}`);
    console.log(`Output directory: ${targetDir}`);

    if (result.imageCount + result.otherCount > 0) {
      console.log(`\nNext steps:`);
      console.log(`1. Review the optimized images and copied files in ${targetDir}`);
      console.log(`2. Update your images/index.ts file to use .${format} extension where applicable`);
      console.log(`3. Consider replacing your original images or updating import paths`);
    } else {
      console.log(`\nNo files were processed. Please check your source directory.`);
    }
  } catch (error) {
    console.error('Error optimizing images:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Execute the optimization
optimizeImages().then(() => {
  console.log('\nScript execution completed.');
});
