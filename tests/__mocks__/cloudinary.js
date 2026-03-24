// tests/__mocks__/cloudinary.js
// Manual Jest mock for cloudinary — auto-discovered by Jest from __mocks__ directory.
module.exports = {
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: "https://res.cloudinary.com/test/image/upload/test123.jpg",
        public_id: "test123",
        resource_type: "image",
        format: "jpg",
        width: 800,
        height: 600
      }),
      destroy: jest.fn().mockResolvedValue({ result: "ok" })
    }
  }
};
