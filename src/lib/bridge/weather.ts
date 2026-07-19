/**
 * Tauri boundary layer — Weather API (Real Online Fetch with Open-Meteo).
 */
import type { Result } from "@/types";

export type WeatherSnapshot = {
  location: string;
  temperatureC: number;
  windSpeedKph: number;
  humidityPct: number;
  conditions: string;
  observedAt: string;
  source: string;
};

// Map WMO Weather Interpretation Codes (WW) to human-readable strings
function mapWeatherCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code === 51 || code === 53 || code === 55) return "Drizzle";
  if (code === 61 || code === 63 || code === 65) return "Rainy";
  if (code === 71 || code === 73 || code === 75) return "Snowy";
  if (code === 80 || code === 81 || code === 82) return "Rain showers";
  if (code === 95 || code === 96 || code === 99) return "Thunderstorm";
  return "Clear sky";
}

export async function fetchWeatherData(location: string): Promise<Result<WeatherSnapshot>> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      ok: false,
      error: { code: "offline", message: "No internet connection — weather unavailable while offline." },
    };
  }

  try {
    let lat = 33.3152; // Default Baghdad Latitude
    let lon = 44.3661; // Default Baghdad Longitude
    let resolvedName = location.trim() || "Baghdad";

    // 1. Resolve coordinates from location string via Open-Meteo Geocoding API
    if (location.trim()) {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location.trim())}&count=1&language=en&format=json`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            const first = geoData.results[0];
            lat = first.latitude;
            lon = first.longitude;
            resolvedName = `${first.name}, ${first.country || ""}`;
          }
        }
      } catch (e) {
        console.warn("Geocoding failed, falling back to IP/default coordinates", e);
      }
    } else {
      // If location is blank, geolocate the user's IP to get their local coordinates
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            lat = ipData.latitude;
            lon = ipData.longitude;
            resolvedName = `${ipData.city || "Local"}, ${ipData.country_name || "Iraq"}`;
          }
        }
      } catch (e) {
        console.warn("IP Geolocation failed, using default coordinates", e);
      }
    }

    // 2. Fetch current weather conditions from Open-Meteo forecast endpoint
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`;
    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;

    const snapshot: WeatherSnapshot = {
      location: resolvedName,
      temperatureC: Math.round(current.temperature_2m),
      windSpeedKph: Math.round(current.wind_speed_10m),
      humidityPct: Math.round(current.relative_humidity_2m),
      conditions: mapWeatherCode(current.weather_code),
      observedAt: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
      source: "open-meteo",
    };

    return { ok: true, data: snapshot };
  } catch (err: any) {
    return {
      ok: false,
      error: { code: "fetch_error", message: err.message || "Failed to fetch weather data." },
    };
  }
}
