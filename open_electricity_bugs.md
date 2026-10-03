# OpenElectricity API Quirks & Bugs

During the development of the Energy Visualiser, we encountered several undocumented quirks and bugs in the OpenElectricity v4 API. This document serves as a reference for eventual bug reports to the upstream project.

## 1. Network Endpoint Ignores `facility_code`
* **Endpoint:** `/v4/data/network/{network_code}`
* **Issue:** When querying the network endpoint, the API silently ignores the `facility_code` query parameter and returns the aggregated data for the entire network. 
* **Impact:** This initially caused our visualisation to plot the entire grid's total energy output on every single physical facility, resulting in massive, identically sized circles.
* **Workaround:** To fetch facility-specific generation data, we must use the `/v4/data/facilities/{network_code}` endpoint (e.g., `/v4/data/facilities/AU`) which correctly breaks down generation by individual unit codes.

## 2. Parameter Naming Inconsistency (`fuel_tech` vs `fueltech`)
* **Endpoint:** `/v4/data/network/{network_code}`
* **Issue:** The standard parameter used across most of the API to filter by fuel technology is `fuel_tech` (with an underscore). However, the network endpoint completely ignores `fuel_tech`. If you pass `fuel_tech=solar_rooftop`, the API does not throw an error; instead, it silently falls back to returning the total energy generation for the entire network (across all fuel types). 
* **Impact:** This caused Rooftop Solar in our charts to report ~574 GWh per day (the entire grid's total generation) instead of the actual ~104 GWh.
* **Workaround:** You must use the undocumented parameter `fueltech` (no underscore) on this specific endpoint to successfully filter by fuel type.

## 3. Strict 365-Day Limit on Daily Intervals
* **Endpoint:** `/v4/data/facilities/AU` and `/v4/data/network/{network_code}`
* **Issue:** When requesting data with a daily interval (`interval=1d`), the API throws a HTTP 400 error if the `date_start` and `date_end` span more than 365 days. 
* **Impact:** While understandable for backend performance and payload size limits, it forces client applications to implement custom pagination or chunking.
* **Workaround:** We had to engineer a request-chunking loop in our data generator that slices the requested timeframe into 1-year blocks, sequentially fetching and stitching the data together.
