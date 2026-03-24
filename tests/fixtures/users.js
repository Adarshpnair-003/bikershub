const User = require("../../models/User");

const defaultPassword = "TestPass123!";

/**
 * Create a single test user. Optionally override any fields.
 * The User pre-save hook will hash the password automatically.
 */
exports.createUser = async (overrides = {}) => {
  const n = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  return User.create({
    username: `testuser_${n}`,
    name: `testuser_${n}`,
    email: `test_${n}@example.com`,
    password: defaultPassword,
    ...overrides
  });
};

/**
 * Create multiple test users.
 */
exports.createUsers = async (count = 3) => {
  return Promise.all(Array.from({ length: count }, () => exports.createUser()));
};

exports.defaultPassword = defaultPassword;
