const cloudinary = require("../config/cloudinary");
const Bike = require("../models/Bike");
const AppError = require("../utils/AppError");

const MAX_BIKES_PER_USER = 10;

async function uploadBikePhoto(file) {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: "bikerhub/garage",
    resource_type: "image",
    transformation: [{ width: 1200, crop: "limit" }],
    quality: "auto",
    fetch_format: "auto"
  });
  return { url: result.secure_url, public_id: result.public_id };
}

async function destroyPhoto(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Log and continue — orphaned media is recoverable, broken UX is not.
    // eslint-disable-next-line no-console
    console.warn("[bikeService] Failed to destroy Cloudinary asset", publicId, err.message);
  }
}

exports.createBike = async (userId, fields, photoFile) => {
  if (!photoFile) throw new AppError("Photo is required", 400, "PHOTO_REQUIRED");

  const count = await Bike.countDocuments({ owner: userId });
  if (count >= MAX_BIKES_PER_USER) {
    throw new AppError(
      "Garage limit reached (10 bikes). Delete one to add another.",
      400,
      "GARAGE_FULL"
    );
  }

  const photo = await uploadBikePhoto(photoFile);

  try {
    const bike = await Bike.create({ owner: userId, ...fields, photo });
    return bike;
  } catch (err) {
    // Mongo write failed after Cloudinary upload — clean up the orphan.
    await destroyPhoto(photo.public_id);
    throw err;
  }
};

exports.listByUser = async (userId) => {
  return Bike.find({ owner: userId })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
};

exports.getById = async (bikeId) => {
  const bike = await Bike.findById(bikeId)
    .populate("owner", "username profilePic")
    .lean();
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  return bike;
};

const ALLOWED_UPDATE_FIELDS = ["brand", "model", "year", "type", "engineCC", "color", "nickname"];

exports.updateBike = async (userId, bikeId, fields, photoFile) => {
  const bike = await Bike.findById(bikeId);
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  if (String(bike.owner) !== String(userId)) {
    // 404 not 403 — existence-probing prevention (spec 4.3)
    throw new AppError("Bike not found", 404, "NOT_FOUND");
  }

  // Allowlist update — never spread untrusted input
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (fields[key] !== undefined) bike[key] = fields[key];
  }

  // Optional photo replacement
  if (photoFile) {
    const oldPublicId = bike.photo?.public_id;
    const newPhoto = await uploadBikePhoto(photoFile);
    bike.photo = newPhoto;
    await bike.save();
    if (oldPublicId) await destroyPhoto(oldPublicId);
    return bike.toObject();
  }

  await bike.save();
  return bike.toObject();
};

exports.setPrimary = async (userId, bikeId) => {
  const bike = await Bike.findById(bikeId);
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  if (String(bike.owner) !== String(userId)) {
    throw new AppError("Bike not found", 404, "NOT_FOUND");
  }

  // Unset any other primary in this user's garage
  await Bike.updateMany(
    { owner: userId, _id: { $ne: bikeId }, isPrimary: true },
    { $set: { isPrimary: false } }
  );

  bike.isPrimary = true;
  await bike.save();
  return bike.toObject();
};

exports.deleteBike = async (userId, bikeId) => {
  const bike = await Bike.findById(bikeId);
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  if (String(bike.owner) !== String(userId)) {
    throw new AppError("Bike not found", 404, "NOT_FOUND");
  }

  // Best-effort Cloudinary cleanup; no auto-promotion of another bike
  await destroyPhoto(bike.photo?.public_id);
  await Bike.findByIdAndDelete(bikeId);
};

exports.MAX_BIKES_PER_USER = MAX_BIKES_PER_USER;
exports._uploadBikePhoto = uploadBikePhoto;
exports._destroyPhoto = destroyPhoto;
