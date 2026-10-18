# Local place geometry

Copyright OpenStreetMap contributors. Data is available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright).

These three GeoJSON FeatureCollections are small present-day OSM map API extracts acquired on 2026-10-15. They are not historical city footprints, authoritative surveys or construction plans. A feature's `osm_timestamp` is its last OSM edit, not its construction date. The accompanying `manifest.json` records requested WGS84 bounds, source URLs, acquisition dates, feature counts and omitted incomplete relations.

Every output coordinate is an original OSM coordinate. Complete ways are kept without simplification or clipping. Polygon winding is normalized to RFC 7946 by reversing source order where needed; this adds no coordinates. Use `metadata.bbox` to clip the rendered view: a way crossing the requested window can extend outside it. Complete multipolygon rings are joined only at matching source node IDs; missing relation members are omitted and listed, never replaced by invented shapes.

`properties` retains `osm_type`, `osm_id`, `osm_version`, `osm_timestamp`, `osm_url`, `name`, `featureClass` and all original `tags`. GeoJSON geometry is longitude/latitude in WGS84. `featureClass` is a convenience layer selector, not a new land-use classification.

No building in this extract has a `height` tag. A few have `building:levels`; these tags do not establish measured height. Uniform extrusions must be labelled illustrative. Keep passenger station, freight yard, heritage site, town and airport identities separate. Do not fill data gaps with generic blocks and label them actual buildings.

Reproducible archive and validation scripts are in `qa/place-grounding/`. The matching Mapzen Terrain Tiles source records are in `public/assets/terrain/local-places/`; their display sampling spacing is not measurement accuracy.
