// Parse PostGIS GEOGRAPHY WKB hex string into {lng, lat}
// WKB Point format (EWKB): 4 bytes order + 4 bytes type + 4 bytes SRID + 8 bytes X + 8 bytes Y
function parseWKB(hex) {
  if (!hex || typeof hex !== 'string') return null;
  try {
    const buf = Buffer.from(hex, 'hex');
    const littleEndian = buf[0] === 1;
    const read = (offset) =>
      littleEndian
        ? buf.readDoubleLE(offset)
        : buf.readDoubleBE(offset);

    // EWKB: byte order(1) + type(4) + srid(4) + x(8) + y(8)
    const hasZ = (buf.readUInt32LE(1) & 0x80000000) !== 0;
    const hasSRID = (buf.readUInt32LE(1) & 0x20000000) !== 0;
    let offset = 5;
    if (hasSRID) offset += 4;

    const lng = read(offset);
    const lat = read(offset + 8);

    if (isNaN(lng) || isNaN(lat)) return null;
    return { lng, lat };
  } catch {
    return null;
  }
}

function attachCoords(event) {
  const coords = parseWKB(event.coordinates);
  return {
    ...event,
    coordinates: coords
      ? { type: 'Point', coordinates: [coords.lng, coords.lat] }
      : null,
  };
}

module.exports = { parseWKB, attachCoords };
