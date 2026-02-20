const fs = require('fs');

function inspectBinaryFbx(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    const buf = fs.readFileSync(filePath);

    // Check FBX binary signature
    const header = buf.slice(0, 21).toString('ascii');
    console.log(`\n=== ${filePath} (${buf.length} bytes) ===`);
    console.log(`Header: "${header}"`);
    console.log(`Is binary FBX: ${header.startsWith('Kaydara FBX Binary')}`);

    // FBX version
    const version = buf.readUInt32LE(23);
    console.log(`FBX version: ${version}`);

    // Search for string patterns in the binary (common node/object names)
    const strings = [];
    for (let i = 0; i < buf.length - 4; i++) {
        // Look for length-prefixed strings (FBX binary format uses 4-byte length)
        const len = buf.readUInt32LE(i);
        if (len > 3 && len < 100 && i + 4 + len < buf.length) {
            const str = buf.slice(i + 4, i + 4 + len).toString('ascii');
            if (/^[a-zA-Z][\w\s()\.\-,]+$/.test(str)) {
                strings.push(str);
                i += 3 + len; // skip ahead
            }
        }
    }

    // Look for known FBX node types and mesh names
    const text = buf.toString('binary');
    const meshPattern = /rp_\w+|Avatar\w+|Moustaches|Eyewear|Bottoms/g;
    const found = text.match(meshPattern);
    if (found) {
        const unique = [...new Set(found)];
        console.log(`Mesh name patterns found: ${unique.join(', ')}`);
    } else {
        console.log('No mesh name patterns found in binary (may be compressed)');
    }

    // Check if it uses zlib compression (FBX 7.5+ uses deflate)
    // Look for zlib deflate headers (0x78 0x9C or 0x78 0xDA)
    let zlibBlocks = 0;
    for (let i = 0; i < buf.length - 1; i++) {
        if ((buf[i] === 0x78 && (buf[i + 1] === 0x9c || buf[i + 1] === 0xda || buf[i + 1] === 0x01))) {
            zlibBlocks++;
        }
    }
    console.log(`Potential zlib blocks: ${zlibBlocks}`);
}

inspectBinaryFbx('extra-skins/n1/Seated Idle (1).fbx');
inspectBinaryFbx('Seated Idle.fbx');
inspectBinaryFbx('extra-skins/2/Seated Idle (1).fbx');
