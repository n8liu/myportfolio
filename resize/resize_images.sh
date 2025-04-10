#!/bin/bash

# bash resize_images.sh
# du -sh photos
# du -sh photos_original

# Create base photos directory if it doesn't exist
mkdir -p photos

# Process California directory
mkdir -p photos/California
for img in photos_original/California/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 20%..."
  convert "$img" -resize 20% "photos/California/$filename"
done

# Process Hawaii directory
mkdir -p photos/Hawaii
for img in photos_original/Hawaii/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 20%..."
  convert "$img" -resize 20% "photos/Hawaii/$filename"
done

# Process Japan directory
mkdir -p photos/Japan
for img in photos_original/Japan/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 20%..."
  convert "$img" -resize 20% "photos/Japan/$filename"
done

# Process SouthKorea directory
mkdir -p photos/SouthKorea
for img in photos_original/SouthKorea/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 20%..."
  convert "$img" -resize 20% "photos/SouthKorea/$filename"
done

echo "All images have been resized to 20% and saved in the photos directory."
