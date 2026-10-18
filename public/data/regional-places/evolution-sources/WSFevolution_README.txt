This repository contains the World Settlement Footprint (WSF) Evolution, a 30m resolution layer outlining the global settlement extent on a yearly basis from 1985 to 2015 derived by means of multitemporal Landsat-5 and Landsat-7 imagery.

The dataset is organized in 5138 GeoTIFF files (EPSG4326 projection) each one referring to a portion of 2x2 degree size (~222x222km on the ground) with an extra buffer of 0.1 degree to avoid any discontinuity between neighbour tiles. Each tile is identified by the lower-left corner coordinates specified in the file name [e.g., the tile WSFevolution_v1_12_18.tif covers the area between (12E;18N) and (14E;20N)].
Values range between 1985 and 2015 corresponding to the estimated year of settlement detection, whereas 0 is no data.

The WSF evolution is licensed under CC-BY-4.0.

A comprehensive publication with all technical details and accuracy figures is currently being finalized. For the time being, please refer to:
Marconcini, M., Metz-Marconcini, A., Esch, T., Gorelick, N. (2021). Understanding Current Trends in Global Urbanisation – The World Settlement Footprint suite. GI_Forum, 1, 33-38. https://doi.org/10.1553/giscience2021_01_s33.

For further information please contact: mattia.marconcini@dlr.de