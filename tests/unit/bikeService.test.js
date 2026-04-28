const cloudinary = require("../../config/cloudinary");
const bikeService = require("../../services/bikeService");
const Bike = require("../../models/Bike");
const AppError = require("../../utils/AppError");
const { createUser } = require("../fixtures/users");
const { createBike } = require("../fixtures/bikes");

describe("bikeService.createBike", () => {
  let user;
  const fakeFile = { path: "/tmp/fake-bike.jpg" };
  const validFields = {
    brand: "Honda", model: "CBR250R", year: 2022,
    type: "sport", engineCC: 250, color: "Red", nickname: ""
  };

  beforeEach(async () => {
    user = await createUser();
    jest.clearAllMocks();
  });

  it("creates a bike with photo and returns it", async () => {
    const bike = await bikeService.createBike(user._id.toString(), validFields, fakeFile);
    expect(bike).toBeDefined();
    expect(bike.brand).toBe("Honda");
    expect(bike.model).toBe("CBR250R");
    expect(bike.photo.url).toBeDefined();
    expect(bike.photo.public_id).toBe("test123");
    expect(String(bike.owner)).toBe(String(user._id));
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      "/tmp/fake-bike.jpg",
      expect.objectContaining({ folder: "bikerhub/garage" })
    );
  });

  it("throws GARAGE_FULL when user already has 10 bikes", async () => {
    for (let i = 0; i < 10; i++) await createBike(user._id, { model: `B${i}` });

    await expect(
      bikeService.createBike(user._id.toString(), validFields, fakeFile)
    ).rejects.toThrow(AppError);
    await expect(
      bikeService.createBike(user._id.toString(), validFields, fakeFile)
    ).rejects.toMatchObject({ statusCode: 400, code: "GARAGE_FULL" });
  });

  it("destroys the uploaded photo if Bike.create fails", async () => {
    const spy = jest.spyOn(Bike, "create").mockRejectedValueOnce(new Error("db down"));
    await expect(
      bikeService.createBike(user._id.toString(), validFields, fakeFile)
    ).rejects.toThrow();
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("test123");
    spy.mockRestore();
  });
});
