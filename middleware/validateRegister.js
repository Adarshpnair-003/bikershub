const { body, validationResult } = require("express-validator");

exports.validateRegister = [

  body("username")
    .optional({ values: "falsy" })  // treats "" same as absent
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),

  body("name")
    .optional({ values: "falsy" })  // treats "" same as absent
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters"),

  body()
    .custom((_, { req }) => {
      const candidate = (req.body.username || req.body.name || "").trim();
      if (!candidate) {
        throw new Error("Username is required");
      }
      return true;
    }),

  body("email")
    .isEmail()
    .withMessage("Valid email required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    next();
  }
];