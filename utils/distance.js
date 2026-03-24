function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(pointA, pointB) {
  const lat1 = Number(pointA?.lat);
  const lng1 = Number(pointA?.lng);
  const lat2 = Number(pointB?.lat);
  const lng2 = Number(pointB?.lng);

  if (
    Number.isNaN(lat1) ||
    Number.isNaN(lng1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lng2)
  ) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

module.exports = haversineDistance;
