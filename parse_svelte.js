const fs = require('fs');

const script = fs.readFileSync('oe_script.js', 'utf8');
const match = script.match(/data: \[null,null,(\{.*\})\]/s);

if (match) {
    let jsObjectStr = match[1];
    
    // We can evaluate it to get the object safely if we wrap it
    try {
        const obj = eval(`(${jsObjectStr})`);
        const facilities = obj.data.facilities;
        
        const extracted = facilities.map(f => ({
            code: f.code,
            name: f.name,
            network_region: f.network_region,
            lat: f.location?.lat,
            lon: f.location?.lng,
            capacities: f.capacities
        }));
        
        fs.writeFileSync('oe_real_coords.json', JSON.stringify(extracted, null, 2));
        console.log(`Extracted ${extracted.length} real coordinates!`);
    } catch(e) {
        console.log("Eval failed:", e);
    }
} else {
    console.log("Match failed");
}
