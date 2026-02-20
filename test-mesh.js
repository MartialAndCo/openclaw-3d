const fs = require('fs');

function inspectFbx(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    const buffer = fs.readFileSync(filePath);
    const content = buffer.toString('ascii');

    // Look for Geometry names
    const geometryMatches = content.match(/Geometry::([a-zA-Z0-9_]+)/g);
    const uniqueGeometries = [...new Set(geometryMatches)];

    // Look for Material names
    const materialMatches = content.match(/Material::([a-zA-Z0-9_]+)/g);
    const uniqueMaterials = [...new Set(materialMatches)];

    console.log(`--- Inspecting ${filePath} ---`);
    console.log(`Size: ${buffer.length} bytes`);
    console.log(`Geometries:`, uniqueGeometries.slice(0, 10)); // limit output
    console.log(`Materials:`, uniqueMaterials.slice(0, 10));
}

inspectFbx('Seated Idle.fbx');
inspectFbx('extra-skins/n1/Seated Idle (1).fbx');
inspectFbx('extra-skins/2/Seated Idle (1).fbx');
