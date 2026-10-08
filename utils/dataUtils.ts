
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataPoint, RawCSVRow, MetricConfig, QualityRange, Persona } from '../types';

export const METRICS: Record<string, MetricConfig> = {
  temp: { key: 'temp', label: 'Temperature', unit: '°C', min: 0, max: 45, colorLow: '#3b82f6', colorMid: '#eab308', colorHigh: '#ef4444' },
  humidity: { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, colorLow: '#fcd34d', colorMid: '#60a5fa', colorHigh: '#1d4ed8' },
  pressure: { key: 'pressure', label: 'Pressure', unit: 'mbar', min: 980, max: 1040, colorLow: '#64748b', colorMid: '#22c55e', colorHigh: '#3b82f6' },
  voc: { key: 'voc', label: 'VOC', unit: 'ppm', min: 0, max: 6, colorLow: '#10b981', colorMid: '#eab308', colorHigh: '#a855f7' },
  pm25: { key: 'pm25', label: 'PM 2.5', unit: 'µg/m³', min: 0, max: 170, colorLow: '#10b981', colorMid: '#f97316', colorHigh: '#a855f7' },
  pm10: { key: 'pm10', label: 'PM 10', unit: 'µg/m³', min: 0, max: 250, colorLow: '#10b981', colorMid: '#f97316', colorHigh: '#a855f7' },
  aqs: { key: 'aqs', label: 'AQS', unit: '', min: 0, max: 100, colorLow: '#a855f7', colorMid: '#eab308', colorHigh: '#10b981' }, 
  dewpoint: { key: 'dewpoint', label: 'Dew Point', unit: '°C', min: -10, max: 35, colorLow: '#a855f7', colorMid: '#3b82f6', colorHigh: '#22c55e' }
};

// Standard Colors
const COLORS = {
  good: '#10b981', // Emerald 500
  moderate: '#eab308', // Yellow 500
  unhealthySens: '#f97316', // Orange 500
  unhealthy: '#ef4444', // Red 500
  severe: '#a855f7', // Purple 500
  danger: '#7f1d1d', // Dark Red 900 (Added for extreme persona risk)
};

// --- PERSONA DEFINITIONS ---
// Each persona maps specific metrics to specific thresholds.
// If a metric isn't listed for a persona, it falls back to 'standard'.

const STANDARD_THRESHOLDS: Record<string, QualityRange[]> = {
  temp: [
    { min: -50, max: 0, label: "Frost", desc: "Freezing point. Risk of ice.", color: '#3b82f6' },
    { min: 0, max: 10, label: "Cold", desc: "Winter conditions.", color: '#60a5fa' },
    { min: 10, max: 15, label: "Cool", desc: "Transitional.", color: '#2dd4bf' },
    { min: 15, max: 25, label: "Mild", desc: "Ideal comfort.", color: '#22c55e' },
    { min: 25, max: 30, label: "Warm", desc: "Summer days.", color: '#eab308' },
    { min: 30, max: 35, label: "Hot", desc: "Heat stress.", color: '#f97316' },
    { min: 35, max: 100, label: "Extreme", desc: "Heat wave.", color: '#ef4444' },
  ],
  humidity: [
    { min: 0, max: 30, label: "Dry", desc: "Irritating to eyes.", color: '#f97316' },
    { min: 30, max: 40, label: "Low-Mid", desc: "Transitional.", color: '#fbbf24' },
    { min: 40, max: 60, label: "Optimal", desc: "Balanced.", color: '#22c55e' },
    { min: 60, max: 80, label: "Mid-High", desc: "Increasing humidity.", color: '#2dd4bf' },
    { min: 80, max: 101, label: "Humid", desc: "Muggy.", color: '#3b82f6' },
  ],
  pressure: [
    { min: 800, max: 1005, label: "Low", desc: "Unsettled.", color: '#64748b' },
    { min: 1005, max: 1010, label: "Variable", desc: "Changing.", color: '#94a3b8' },
    { min: 1010, max: 1025, label: "Normal", desc: "Stable.", color: '#22c55e' },
    { min: 1025, max: 1100, label: "High", desc: "Anticyclone.", color: '#3b82f6' },
  ],
  aqs: [
    { min: 81, max: 100, label: "Good", desc: "Satisfactory.", color: COLORS.good },
    { min: 61, max: 81, label: "Moderate", desc: "Acceptable.", color: '#84cc16' },
    { min: 41, max: 61, label: "Polluted", desc: "Poor quality.", color: COLORS.unhealthySens },
    { min: 21, max: 41, label: "Very Polluted", desc: "Very poor.", color: COLORS.unhealthy },
    { min: 0, max: 21, label: "Severe", desc: "Emergency.", color: COLORS.severe },
  ],
  voc: [
    { min: 0, max: 0.3, label: "Good", desc: "Low level.", color: COLORS.good },
    { min: 0.3, max: 1, label: "Moderate", desc: "Acceptable.", color: COLORS.moderate },
    { min: 1, max: 2.5, label: "High", desc: "Discomfort possible.", color: COLORS.unhealthySens },
    { min: 2.5, max: 5.5, label: "Very High", desc: "Health effects.", color: COLORS.unhealthy },
    { min: 5.5, max: 999, label: "Hazardous", desc: "Toxic.", color: COLORS.severe },
  ],
  pm25: [
    { min: 0, max: 20, label: "Good", desc: "Satisfactory.", color: COLORS.good },
    { min: 20, max: 50, label: "Moderate", desc: "Acceptable.", color: COLORS.moderate },
    { min: 50, max: 90, label: "Sensitive", desc: "Sensitive groups risk.", color: COLORS.unhealthySens },
    { min: 90, max: 140, label: "Unhealthy", desc: "Everyone affected.", color: COLORS.unhealthy },
    { min: 140, max: 999, label: "Hazardous", desc: "Serious health effects.", color: COLORS.severe },
  ],
  pm10: [
    { min: 0, max: 30, label: "Good", desc: "Satisfactory.", color: COLORS.good },
    { min: 30, max: 75, label: "Moderate", desc: "Acceptable.", color: COLORS.moderate },
    { min: 75, max: 125, label: "Sensitive", desc: "Sensitive groups risk.", color: COLORS.unhealthySens },
    { min: 125, max: 200, label: "Unhealthy", desc: "Everyone affected.", color: COLORS.unhealthy },
    { min: 200, max: 999, label: "Hazardous", desc: "Serious health effects.", color: COLORS.severe },
  ],
  dewpoint: [
    { min: -100, max: 0, label: "Very Dry", desc: "Extremely dry air.", color: '#a855f7' },
    { min: 0, max: 10, label: "Dry", desc: "Comfortable, dry air.", color: '#3b82f6' },
    { min: 10, max: 18, label: "Comfortable", desc: "Pleasant air conditions.", color: '#22c55e' },
    { min: 18, max: 24, label: "Sticky", desc: "Humid, sticky feeling.", color: '#eab308' },
    { min: 24, max: 100, label: "Extreme", desc: "Oppressive and extremely humid.", color: '#ef4444' }
  ]
};

const ASTHMATIC_THRESHOLDS: Record<string, QualityRange[]> = {
  // Asthmatics react to much lower concentrations
  pm25: [
    { min: 0, max: 10, label: "Safe", desc: "Low risk.", color: COLORS.good },
    { min: 10, max: 25, label: "Caution", desc: "Inhaler may be needed.", color: COLORS.unhealthySens },
    { min: 25, max: 50, label: "Unhealthy", desc: "High trigger risk.", color: COLORS.unhealthy },
    { min: 50, max: 999, label: "Danger", desc: "Avoid outdoors.", color: COLORS.danger },
  ],
  pm10: [
    { min: 0, max: 20, label: "Safe", desc: "Low risk.", color: COLORS.good },
    { min: 20, max: 40, label: "Caution", desc: "Inhaler may be needed.", color: COLORS.unhealthySens },
    { min: 40, max: 70, label: "Unhealthy", desc: "High trigger risk.", color: COLORS.unhealthy },
    { min: 70, max: 999, label: "Danger", desc: "Avoid outdoors.", color: COLORS.danger },
  ],
  voc: [
    { min: 0, max: 0.2, label: "Safe", desc: "Low risk.", color: COLORS.good },
    { min: 0.2, max: 0.6, label: "Caution", desc: "Irritation likely.", color: COLORS.unhealthySens },
    { min: 0.6, max: 999, label: "Danger", desc: "High trigger risk.", color: COLORS.danger },
  ]
};

const ATHLETE_THRESHOLDS: Record<string, QualityRange[]> = {
  // Athletes breathe 10-20x more air, increasing dose significantly
  pm25: [
    { min: 0, max: 12, label: "Optimal", desc: "Best for training.", color: COLORS.good },
    { min: 12, max: 35, label: "Reduce Intensity", desc: "Limit heavy exertion.", color: COLORS.unhealthySens },
    { min: 35, max: 55, label: "Avoid Cardio", desc: "Accumulation risk.", color: COLORS.unhealthy },
    { min: 55, max: 999, label: "No Training", desc: "Health damage likely.", color: COLORS.danger },
  ],
  temp: [
    { min: -50, max: 5, label: "Cold Stress", desc: "Hypothermia risk.", color: '#3b82f6' },
    { min: 5, max: 25, label: "Optimal", desc: "Best performance.", color: '#22c55e' },
    { min: 25, max: 30, label: "Heat Stress", desc: "Hydrate frequently.", color: COLORS.unhealthySens },
    { min: 30, max: 999, label: "Heat Stroke", desc: "Stop training.", color: COLORS.danger },
  ]
};

const CHILD_THRESHOLDS: Record<string, QualityRange[]> = {
  // Children have developing lungs and higher breath rate per kg
  pm25: [
    { min: 0, max: 12, label: "Safe", desc: "Safe for play.", color: COLORS.good },
    { min: 12, max: 35, label: "Caution", desc: "Limit outdoor play.", color: COLORS.moderate },
    { min: 35, max: 55, label: "Unhealthy", desc: "Sensitive lungs risk.", color: COLORS.unhealthySens },
    { min: 55, max: 999, label: "Danger", desc: "Keep indoors.", color: COLORS.danger },
  ],
  pm10: [
    { min: 0, max: 40, label: "Safe", desc: "Safe for play.", color: COLORS.good },
    { min: 40, max: 80, label: "Caution", desc: "Limit dust exposure.", color: COLORS.moderate },
    { min: 80, max: 150, label: "Unhealthy", desc: "Respiratory risk.", color: COLORS.unhealthySens },
    { min: 150, max: 999, label: "Danger", desc: "Keep indoors.", color: COLORS.danger },
  ]
};

// Aggregated access point
export const PERSONA_STANDARDS: Record<Persona, Record<string, QualityRange[]>> = {
  standard: STANDARD_THRESHOLDS,
  asthmatic: { ...STANDARD_THRESHOLDS, ...ASTHMATIC_THRESHOLDS }, // Overlay overrides
  athlete: { ...STANDARD_THRESHOLDS, ...ATHLETE_THRESHOLDS },
  child: { ...STANDARD_THRESHOLDS, ...CHILD_THRESHOLDS },
};

// Backward compatibility wrapper for referencing standard
export const AIR_QUALITY_STANDARDS = STANDARD_THRESHOLDS;


const parseNumber = (val: string): number | null => {
  if (!val || val.trim() === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

export const isDataComplete = (d: DataPoint): boolean => {
  return d.temp !== null &&
         d.humidity !== null &&
         d.pressure !== null &&
         d.voc !== null &&
         d.aqs !== null &&
         d.pm1 !== null &&
         d.pm25 !== null &&
         d.pm10 !== null;
};

export const parseCSVData = (csvText: string): Promise<DataPoint[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data: DataPoint[] = results.data
            .filter(row => row.Date) // We only require a date to include it in the dataset
            .map((row, index) => {
               const lat = row.Latitude ? parseFloat(row.Latitude) : null;
               const lng = row.Longitude ? parseFloat(row.Longitude) : null;
               
               return {
                id: index,
                timestamp: new Date(row.Date).getTime(),
                dateStr: row.Date,
                voc: parseNumber(row["VOC, ppm"]),
                aqs: parseNumber(row["AQS"]),
                temp: parseNumber(row["Temperature, °C"]),
                humidity: parseNumber(row["Humidity, %"]),
                pressure: parseNumber(row["Pressure, mbar"]),
                pm1: parseNumber(row["PM1, ug/m3"]),
                pm25: parseNumber(row["PM2.5, ug/m3"]),
                pm10: parseNumber(row["PM10, ug/m3"]),
                lat: (lat !== null && !isNaN(lat)) ? lat : null,
                lng: (lng !== null && !isNaN(lng)) ? lng : null,
              };
            })
            .filter(d => !isNaN(d.timestamp)) // Ensure valid date
            .sort((a, b) => a.timestamp - b.timestamp);

          resolve(data);
        } catch (e) {
          reject(e);
        }
      },
      error: (err: Error) => reject(err),
    });
  });
};

// Updated: Returns specific color based on Persona
export const getQualityColor = (
    value: number | null, 
    key: string, 
    persona: Persona = 'standard'
): string => {
  if (value === null) return '#888888';

  // Get the standards for this specific persona, fallback to standard if metric undefined
  const standardsMap = PERSONA_STANDARDS[persona] || STANDARD_THRESHOLDS;
  const standards = standardsMap[key] || STANDARD_THRESHOLDS[key];

  if (!standards) {
    return '#888888';
  }

  // Find the matching range
  for (const range of standards) {
    if (key === 'aqs') {
       if (value >= range.min && value <= range.max) return range.color;
    } else {
       if (value >= range.min && value < range.max) return range.color;
       if (range.max > 500 && value >= range.min) return range.color;
    }
  }

  return standards[standards.length - 1].color;
};

export const getGradientColor = (value: number | null, config: MetricConfig): string => {
    return getQualityColor(value, config.key, 'standard');
};

// --- NEW XLSX PARSING & ALIGNMENT UTILITIES ---

const findKey = (row: any, searchTerms: string[]): string | undefined => {
  const keys = Object.keys(row);
  return keys.find(k => {
    const lowerKey = k.toLowerCase().trim();
    return searchTerms.some(term => lowerKey.includes(term.toLowerCase()));
  });
};

export const cleanNumberValue = (val: any): number | null => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    let cleaned = val.trim();
    cleaned = cleaned.replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
};

export const parseExcelDate = (val: any): number | null => {
  if (!val) return null;
  if (val instanceof Date) {
    return val.getTime();
  }
  if (typeof val === 'number') {
    // Excel serial date to JS timestamp
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const msPerDay = 24 * 60 * 60 * 1000;
    return epoch.getTime() + val * msPerDay;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    
    // Check if format matches European/Italian standard (e.g., 30/06/2026 09:48:00)
    // with separator / or . or -
    const parts = trimmed.split(/[\s/:\.-]+/);
    if (parts.length >= 6) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const min = parseInt(parts[4], 10);
      const sec = parseInt(parts[5], 10);
      
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        // If year is in index 2 (e.g. 30/06/2026)
        if (p2 > 100) {
          if (p0 > 12) {
            // DD/MM/YYYY
            return new Date(p2, p1 - 1, p0, hour, min, sec).getTime();
          } else {
            // Can be MM/DD or DD/MM. Since we are in Italy, standard is DD/MM/YYYY.
            // Let's assume DD/MM/YYYY unless invalid
            const testDate = new Date(p2, p1 - 1, p0, hour, min, sec);
            if (!isNaN(testDate.getTime())) return testDate.getTime();
          }
        }
      }
    }
    
    const t = Date.parse(trimmed);
    if (!isNaN(t)) return t;
  }
  return null;
};

export const parseExcelFile = (arrayBuffer: ArrayBuffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });
      
      const parsedRows = jsonData.map((row) => {
        const dateKey = findKey(row, ['date-time', 'date_time', 'date time', 'timestamp', 'date', 'time', 'data-ora', 'orario', 'ora', 'cest']);
        const tempKey = findKey(row, ['temperature', 'temperatura', 'temp', 'ch:1', 'ch1', 'ch:1 - temperature']);
        const humKey = findKey(row, ['humidity', 'rh', 'umidità', 'ch:2', 'ch2', '%']);
        const dewKey = findKey(row, ['dew point', 'dewpoint', 'dew_point', 'punto di rugiada']);
        const latKey = findKey(row, ['latitude', 'lat', 'latitudine']);
        const lngKey = findKey(row, ['longitude', 'lng', 'lon', 'longitudine']);

        const timestamp = dateKey ? parseExcelDate(row[dateKey]) : null;
        const temp = tempKey ? cleanNumberValue(row[tempKey]) : null;
        const humidity = humKey ? cleanNumberValue(row[humKey]) : null;
        const dewpoint = dewKey ? cleanNumberValue(row[dewKey]) : null;
        const lat = latKey ? cleanNumberValue(row[latKey]) : null;
        const lng = lngKey ? cleanNumberValue(row[lngKey]) : null;

        return {
          timestamp,
          temp,
          humidity,
          dewpoint,
          lat,
          lng,
          rawRow: row
        };
      }).filter(r => r.timestamp !== null);

      resolve(parsedRows);
    } catch (error) {
      reject(error);
    }
  });
};

export const alignSupplementaryData = (
  existingData: DataPoint[],
  suppPoints: any[]
): DataPoint[] => {
  if (existingData.length === 0) return [];
  
  return existingData.map(pt => {
    let closestSupp = null;
    let minDiff = Infinity;
    
    for (const supp of suppPoints) {
      const diff = Math.abs(pt.timestamp - supp.timestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closestSupp = supp;
      }
    }
    
    if (closestSupp) {
      return {
        ...pt,
        temp: closestSupp.temp !== null ? closestSupp.temp : pt.temp,
        humidity: closestSupp.humidity !== null ? closestSupp.humidity : pt.humidity,
        dewpoint: closestSupp.dewpoint !== null ? closestSupp.dewpoint : pt.dewpoint,
      };
    }
    return pt;
  });
};

export const convertExcelToDataPoints = (excelRows: any[]): DataPoint[] => {
  return excelRows.map((r, index) => {
    return {
      id: index,
      timestamp: r.timestamp!,
      dateStr: new Date(r.timestamp!).toLocaleString(),
      voc: r.rawRow["VOC, ppm"] ? cleanNumberValue(r.rawRow["VOC, ppm"]) : null,
      aqs: r.rawRow["AQS"] ? cleanNumberValue(r.rawRow["AQS"]) : null,
      temp: r.temp,
      humidity: r.humidity,
      pressure: r.rawRow["Pressure, mbar"] ? cleanNumberValue(r.rawRow["Pressure, mbar"]) : null,
      pm1: r.rawRow["PM1, ug/m3"] ? cleanNumberValue(r.rawRow["PM1, ug/m3"]) : null,
      pm25: r.rawRow["PM2.5, ug/m3"] ? cleanNumberValue(r.rawRow["PM2.5, ug/m3"]) : null,
      pm10: r.rawRow["PM10, ug/m3"] ? cleanNumberValue(r.rawRow["PM10, ug/m3"]) : null,
      dewpoint: r.dewpoint,
      lat: r.lat,
      lng: r.lng,
    };
  });
};
