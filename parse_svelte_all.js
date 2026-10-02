const fs = require('fs');
const script = fs.readFileSync('oe_script.js', 'utf8');
const match = script.match(/data: \[null,null,(\{.*\})\]/s);

if (match) {
    let jsObjectStr = match[1];
    try {
        const obj = eval(`(${jsObjectStr})`);
        const facilities = obj.data.facilities;
        
        const extracted = [];
        for (let f of facilities) {
            let startYear = 2000;
            let maxCap = 0;
            let primaryFuel = 'gas';
            
            if (f.units && f.units.length > 0) {
                let earliest = 2100;
                for (let u of f.units) {
                    if (u.commencement_date) {
                        const year = parseInt(u.commencement_date.substring(0, 4));
                        if (!isNaN(year) && year < earliest) earliest = year;
                    }
                    const cap = u.capacity_registered || u.capacity_maximum || 0;
                    if (cap > maxCap) {
                        maxCap = cap;
                        primaryFuel = u.fueltech_id;
                    }
                }
                if (earliest !== 2100) startYear = earliest;
            }
            
            if (!f.location || f.location.lat == null) continue;

            extracted.push({
                code: f.code,
                name: f.name,
                network_region: f.network_region,
                lat: f.location.lat,
                lon: f.location.lng,
                start_year: startYear,
                capacity_mw: maxCap,
                fueltech: primaryFuel
            });
        }
        
        fs.writeFileSync('oe_full_stations.json', JSON.stringify(extracted, null, 2));
        console.log(`Extracted ${extracted.length} full stations!`);
    } catch(e) { console.log(e); }
}
