import ExifReader from 'exifreader';
import { GeoPhoto } from '../types';

export interface PhotoProcessingResult {
  photos: GeoPhoto[];
  totalProcessed: number;
  skippedNoGps: number;
  failedCount: number;
}

export const processImageFiles = async (files: File[]): Promise<PhotoProcessingResult> => {
  const photos: GeoPhoto[] = [];
  let skippedNoGps = 0;
  let failedCount = 0;

  // Filter image files
  const imageFiles = files.filter(file => 
    file.type.startsWith('image/') || 
    /\.(jpg|jpeg|png|tif|tiff|webp)$/i.test(file.name)
  );

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer, { expanded: true });

      let lat: number | null = null;
      let lng: number | null = null;

      // Extract GPS coordinates
      if (tags.gps && typeof tags.gps.Latitude === 'number' && typeof tags.gps.Longitude === 'number') {
        lat = tags.gps.Latitude;
        lng = tags.gps.Longitude;
      } else if (tags['GPSLatitude'] && tags['GPSLongitude']) {
        const latTag = tags['GPSLatitude'];
        const lngTag = tags['GPSLongitude'];
        
        if (typeof latTag.description === 'number' && typeof lngTag.description === 'number') {
          lat = latTag.description;
          lng = lngTag.description;
        }
      }

      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        skippedNoGps++;
        continue;
      }

      // Extract metadata
      let dateTimeStr = file.lastModified ? new Date(file.lastModified).toLocaleString() : undefined;
      if (tags.exif?.DateTimeOriginal?.description) {
        dateTimeStr = String(tags.exif.DateTimeOriginal.description);
      } else if (tags.exif?.DateTime?.description) {
        dateTimeStr = String(tags.exif.DateTime.description);
      }

      const make = tags.exif?.Make?.description ? String(tags.exif.Make.description) : undefined;
      const model = tags.exif?.Model?.description ? String(tags.exif.Model.description) : undefined;

      const url = URL.createObjectURL(file);

      photos.push({
        id: `photo-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        url,
        lat,
        lng,
        dateTime: dateTimeStr,
        make,
        model,
        fileSize: file.size,
        timestamp: file.lastModified
      });
    } catch (err) {
      console.warn(`Could not parse EXIF for ${file.name}:`, err);
      failedCount++;
    }
  }

  return {
    photos,
    totalProcessed: imageFiles.length,
    skippedNoGps,
    failedCount
  };
};
