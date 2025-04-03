#!/bin/bash

# Create base photos directory if it doesn't exist
mkdir -p photos

# Process California directory
mkdir -p photos/California
for img in photos_original/California/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 50%..."
  convert "$img" -resize 50% "photos/California/$filename"
done

# Process Hawaii directory
mkdir -p photos/Hawaii
for img in photos_original/Hawaii/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 50%..."
  convert "$img" -resize 50% "photos/Hawaii/$filename"
done

# Process Japan directory
mkdir -p photos/Japan
for img in photos_original/Japan/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 50%..."
  convert "$img" -resize 50% "photos/Japan/$filename"
done

# Process SouthKorea directory
mkdir -p photos/SouthKorea
for img in photos_original/SouthKorea/*.JPG; do
  filename=$(basename "$img")
  echo "Resizing $img to 50%..."
  convert "$img" -resize 50% "photos/SouthKorea/$filename"
done

echo "All images have been resized to 50% and saved in the photos directory."
