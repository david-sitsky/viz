const fs = require('fs');
const script = fs.readFileSync('oe_script.js', 'utf8');
const match = script.match(/data: \[null,null,(\{.*\})\]/s);
if (match) {
    let jsObjectStr = match[1];
    try {
        const obj = eval(`(${jsObjectStr})`);
        const facilities = obj.data.facilities;
        console.log("Facility fields:", Object.keys(facilities[0]));
        console.log("First facility details:", JSON.stringify(facilities[0], null, 2));
    } catch(e) { console.log(e); }
}
