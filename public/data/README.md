
# GeoJSON Data Files

This directory should contain GeoJSON files used for map visualizations in the application.

## Required Files

- `goesan.geojson` - Contains administrative boundary data in EPSG:4326 format with Polygon and MultiPolygon geometries.

## Properties Structure

The GeoJSON features should include the following properties:

- `TOT_REG_CD` - Unique region code that matches with the analysis data
- `EMD_CD` - Administrative division code (optional)
- `EMD_KOR_NM` - Korean name of the region (optional)

## How It Works

The map component will automatically load and visualize these GeoJSON files. When analysis results are available, regions will be color-coded based on how many decline criteria they meet:

- Red: 3 criteria met
- Orange: 2 criteria met
- Yellow: 1 criterion met
- Gray: 0 criteria met (default)

## Example Feature

```json
{
  "type": "Feature",
  "properties": {
    "TOT_REG_CD": "4376025021",
    "EMD_CD": "4376025",
    "EMD_KOR_NM": "괴산읍"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  }
}
```
