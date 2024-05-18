const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.json());

// Function to delete image and its thumbnail from the server
function deleteImage(imagePath, thumbnailPath) {
  try {
    fs.unlinkSync(imagePath);
    fs.unlinkSync(thumbnailPath);
    console.log(`Deleted: ${imagePath}, ${thumbnailPath}`);
    return true;
  } catch (error) {
    console.error(`Error deleting image: ${error}`);
    return false;
  }
}

app.post('/upload', upload.single('image'), async (req, res) => {
  const { file } = req;
  const uniqueFilename = `${Date.now()}-${file.originalname}`;
  const thumbnailPath = path.join('thumbnails', uniqueFilename);
  const originalImagePath = path.join('images', uniqueFilename);

  console.log('Received upload request');
  console.log('File information:', file);

  try {
    // Save the original image
    fs.renameSync(file.path, originalImagePath);

    // Create a thumbnail
    await sharp(originalImagePath)
      .resize(100, 100)
      .toFile(thumbnailPath);

    res.json({ thumbnail: `/thumbnails/${uniqueFilename}`, fullsize: `/images/${uniqueFilename}` });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Endpoint to get list of thumbnails
app.get('/thumbnails', (req, res) => {
  const thumbnailsDir = path.join(__dirname, 'thumbnails');
  fs.readdir(thumbnailsDir, (err, files) => {
    if (err) {
      console.error('Error reading thumbnails directory:', err);
      return res.status(500).json({ error: 'Failed to load thumbnails' });
    }
    const thumbnails = files.map(file => ({
      filename: file,
      thumbnail: `/thumbnails/${file}`,
      fullsize: `/images/${file}`
    }));
    res.json(thumbnails);
  });
});

// Endpoint to delete an image and its thumbnail
app.delete('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'images', filename);
  const thumbnailPath = path.join(__dirname, 'thumbnails', filename);

  if (fs.existsSync(imagePath) && fs.existsSync(thumbnailPath)) {
    if (deleteImage(imagePath, thumbnailPath)) {
      res.status(200).json({ message: 'Image and thumbnail deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete image and thumbnail' });
    }
  } else {
    res.status(404).json({ error: 'Image or thumbnail not found' });
  }
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});

