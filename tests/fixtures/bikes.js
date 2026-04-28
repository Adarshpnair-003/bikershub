const Bike = require("../../models/Bike");

const defaultPhoto = {
  url: "https://res.cloudinary.com/test/image/upload/test123.jpg",
  public_id: "test123"
};

/**
 * Create a single test bike for an owner. Optionally override fields.
 */
exports.createBike = async (ownerId, overrides = {}) => {
  return Bike.create({
    owner: ownerId,
    brand: "Yamaha",
    model: "MT-15",
    year: 2023,
    type: "naked",
    engineCC: 155,
    color: "Cyan",
    nickname: "",
    photo: { ...defaultPhoto },
    isPrimary: false,
    ...overrides
  });
};

/**
 * Create multiple bikes for an owner.
 */
exports.createBikes = async (ownerId, count = 3) => {
  const bikes = [];
  for (let i = 0; i < count; i++) {
    bikes.push(await exports.createBike(ownerId, { model: `Bike${i}` }));
  }
  return bikes;
};

exports.defaultPhoto = defaultPhoto;
