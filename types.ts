
export interface RawCSVRow {
  "Date": string;
  "VOC, ppm": string;
  "AQS": string;
  "Temperature, °C": string;
  "Humidity, %": string;
  "Pressure, mbar": string;
  "PM1, ug/m3": string;
  "PM2.5, ug/m3": string;
  "PM10, ug/m3": string;
  "Latitude": string;
  "Longitude": string;
}

export interface DataPoint {
  id: number;
  timestamp: number; // Unix timestamp
  dateStr: string;
  voc: number | null;
  aqs: number | null;
  temp: number | null;
  humidity: number | null;
  pressure: number | null;
  pm1: number | null;
  pm25: number | null;
  pm10: number | null;
  dewpoint: number | null;
  lat: number | null;
  lng: number | null;
}

export interface GeoPhoto {
  id: string;
  name: string;
  url: string;
  lat: number;
  lng: number;
  dateTime?: string;
  make?: string;
  model?: string;
  fileSize?: number;
  timestamp?: number;
}

export type MetricKey = 'voc' | 'aqs' | 'temp' | 'humidity' | 'pressure' | 'pm1' | 'pm25' | 'pm10' | 'dewpoint';

export interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  colorLow: string;
  colorMid: string;
  colorHigh: string;
}

export interface QualityRange {
  min: number;
  max: number;
  label: string;
  desc: string;
  color: string; // Hex
}

export type VisualizationMode = 'path' | 'points' | 'heatmap';

export type Persona = 'standard' | 'asthmatic' | 'child' | 'athlete';

export interface FilterState {
  startTime: number | null;
  endTime: number | null;
  hideNoGps: boolean;
  onlyCompleteData: boolean;
}

export interface AppState {
  allData: DataPoint[]; // Store all loaded data
  data: DataPoint[]; // Store currently filtered data
  photos: GeoPhoto[]; // Loaded thermal / EXIF photos
  isPhotoLayerVisible: boolean; // Layer toggle for photos
  isPlaying: boolean;
  currentIndex: number;
  playbackSpeed: number; // Multiplier (1, 5, 10)
  theme: 'light' | 'dark';
  selectedMetric: MetricKey;
  visualizationMode: VisualizationMode;
  useDynamicHeatmapRadius: boolean; // New property for variable radius
  isDragActive: boolean;
  isGuideOpen: boolean;
  isFilterOpen: boolean;
  filters: FilterState;
  selectedPersona: Persona; // New: The active risk profile
}
