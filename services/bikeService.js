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

exports.MAX_BIKES_PER_USER = MAX_BIKES_PER_USER;
exports._uploadBikePhoto = uploadBikePhoto;
exports._destroyPhoto = destroyPhoto;
