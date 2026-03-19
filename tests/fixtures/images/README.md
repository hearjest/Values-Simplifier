# Test Image Fixtures

This directory should contain sample images for Playwright tests.

## Required Test Images

Create or add the following images to this directory:

### 1. test-image.jpg
- **Purpose**: Standard test image for most upload tests
- **Recommended specs**: 800x600 pixels, JPEG format, ~200KB
- **Usage**: Primary test image for upload, display, and processing tests

### 2. test-image.png
- **Purpose**: Test PNG format support
- **Recommended specs**: 800x600 pixels, PNG format, ~500KB
- **Usage**: Format compatibility tests

### 3. test-image.jpeg
- **Purpose**: Test .jpeg extension (vs .jpg)
- **Recommended specs**: 800x600 pixels, JPEG format, ~200KB
- **Usage**: Extension validation tests

### 4. test-image.webp
- **Purpose**: Test WebP format support
- **Recommended specs**: 800x600 pixels, WebP format, ~100KB
- **Usage**: Modern format support tests

### 5. large-test-image.jpg
- **Purpose**: Test large file upload handling
- **Recommended specs**: 3000x2000+ pixels, JPEG format, 5+ MB
- **Usage**: Performance and large file tests

### 6. invalid.txt
- **Purpose**: Test error handling for non-image files
- **Content**: Any text content
- **Usage**: Error handling and validation tests

## Creating Test Images

### Option 1: Use Your Own Images
Copy any images you have to this directory and rename them appropriately.

### Option 2: Download Free Stock Images
Use sites like:
- [Unsplash](https://unsplash.com)
- [Pexels](https://pexels.com)
- [Pixabay](https://pixabay.com)

### Option 3: Generate Placeholder Images
Use online placeholder generators:
- https://placeholder.com
- https://picsum.photos

### Option 4: Create with Code
```javascript
// Generate a simple colored rectangle with Canvas
const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');

// Fill with color
ctx.fillStyle = '#3498db';
ctx.fillRect(0, 0, 800, 600);

// Add text
ctx.fillStyle = 'white';
ctx.font = '48px Arial';
ctx.fillText('Test Image', 300, 300);

// Save
const buffer = canvas.toBuffer('image/jpeg');
fs.writeFileSync('./test-image.jpg', buffer);
```

## Notes

- **Git Ignore**: Large images can be excluded from version control by adding to `.gitignore`
- **Copyright**: Ensure you have rights to use any test images
- **Size**: Keep test images reasonably small to avoid slow tests
- **Variety**: Include different formats, sizes, and aspect ratios for comprehensive testing

## Example .gitignore Entry

Add to your `.gitignore` if you don't want to commit test images:

```
# Test fixtures - too large for git
tests/fixtures/images/*.jpg
tests/fixtures/images/*.png
tests/fixtures/images/*.jpeg
tests/fixtures/images/*.webp

# Keep the invalid.txt for tests
!tests/fixtures/images/invalid.txt
```

## Quick Setup

If you just want to run tests quickly, create a simple test image:

```powershell
# Create a dummy text file as invalid.txt
echo "This is not an image" > invalid.txt

# For actual test images, download or copy any JPG/PNG files you have
# and name them according to the list above
```
