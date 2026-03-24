// Environment variables are set in tests/setup.js before any app imports.

const haversineDistance = require("../../utils/distance");
const { escapeRegex } = require("../../utils/sanitize");
const AppError = require("../../utils/AppError");
const apiResponse = require("../../utils/apiResponse");
const catchAsync = require("../../utils/catchAsync");

// ---------------------------------------------------------------------------
// haversineDistance
// ---------------------------------------------------------------------------
describe("haversineDistance", () => {
  it("returns approximate straight-line distance between Mumbai and Pune (~120 km)", () => {
    // Mumbai: 19.0760° N, 72.8777° E
    // Pune:   18.5204° N, 73.8567° E
    // Haversine (straight-line) distance is ~120 km; road distance is ~149 km
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const pune = { lat: 18.5204, lng: 73.8567 };
    const dist = haversineDistance(mumbai, pune);
    // Allow ±5 km tolerance around the straight-line distance
    expect(dist).toBeGreaterThan(115);
    expect(dist).toBeLessThan(125);
  });

  it("returns 0 for identical points", () => {
    const point = { lat: 19.076, lng: 72.877 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it("returns 0 when pointA is null", () => {
    expect(haversineDistance(null, { lat: 18.52, lng: 73.85 })).toBe(0);
  });

  it("returns 0 when pointB is null", () => {
    expect(haversineDistance({ lat: 19.076, lng: 72.877 }, null)).toBe(0);
  });

  it("returns 0 when coordinates are non-numeric strings", () => {
    expect(haversineDistance({ lat: "abc", lng: "def" }, { lat: 18.52, lng: 73.85 })).toBe(0);
  });

  it("returns 0 when both inputs are undefined", () => {
    expect(haversineDistance(undefined, undefined)).toBe(0);
  });

  it("returns a positive number for two distinct valid points", () => {
    const delhi = { lat: 28.6139, lng: 77.209 };
    const bangalore = { lat: 12.9716, lng: 77.5946 };
    const dist = haversineDistance(delhi, bangalore);
    expect(dist).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// escapeRegex
// ---------------------------------------------------------------------------
describe("escapeRegex", () => {
  it("escapes dot (.)", () => {
    expect(escapeRegex(".")).toBe("\\.");
  });

  it("escapes asterisk (*)", () => {
    expect(escapeRegex("*")).toBe("\\*");
  });

  it("escapes plus (+)", () => {
    expect(escapeRegex("+")).toBe("\\+");
  });

  it("escapes question mark (?)", () => {
    expect(escapeRegex("?")).toBe("\\?");
  });

  it("escapes caret (^)", () => {
    expect(escapeRegex("^")).toBe("\\^");
  });

  it("escapes dollar sign ($)", () => {
    expect(escapeRegex("$")).toBe("\\$");
  });

  it("escapes opening curly brace ({)", () => {
    expect(escapeRegex("{")).toBe("\\{");
  });

  it("escapes closing curly brace (})", () => {
    expect(escapeRegex("}")).toBe("\\}");
  });

  it("escapes opening parenthesis (()", () => {
    expect(escapeRegex("(")).toBe("\\(");
  });

  it("escapes closing parenthesis ())", () => {
    expect(escapeRegex(")")).toBe("\\)");
  });

  it("escapes pipe (|)", () => {
    expect(escapeRegex("|")).toBe("\\|");
  });

  it("escapes opening bracket ([)", () => {
    expect(escapeRegex("[")).toBe("\\[");
  });

  it("escapes closing bracket (])", () => {
    expect(escapeRegex("]")).toBe("\\]");
  });

  it("escapes backslash (\\\\)", () => {
    expect(escapeRegex("\\")).toBe("\\\\");
  });

  it("escapes a ReDoS-style input with multiple special chars", () => {
    const dangerous = "(a+)+";
    const escaped = escapeRegex(dangerous);
    // Must not throw when used in RegExp
    expect(() => new RegExp(escaped)).not.toThrow();
    expect(escaped).toBe("\\(a\\+\\)\\+");
  });

  it("leaves plain alphanumeric strings unchanged", () => {
    expect(escapeRegex("hello123")).toBe("hello123");
  });

  it("returns empty string for non-string input (number)", () => {
    expect(escapeRegex(42)).toBe("");
  });

  it("returns empty string for non-string input (null)", () => {
    expect(escapeRegex(null)).toBe("");
  });

  it("returns empty string for non-string input (undefined)", () => {
    expect(escapeRegex(undefined)).toBe("");
  });

  it("returns empty string for non-string input (object)", () => {
    expect(escapeRegex({})).toBe("");
  });
});

// ---------------------------------------------------------------------------
// AppError
// ---------------------------------------------------------------------------
describe("AppError", () => {
  it("sets message correctly", () => {
    const err = new AppError("Not found", 404, "NOT_FOUND");
    expect(err.message).toBe("Not found");
  });

  it("sets statusCode correctly", () => {
    const err = new AppError("Forbidden", 403, "FORBIDDEN");
    expect(err.statusCode).toBe(403);
  });

  it("sets code correctly", () => {
    const err = new AppError("Unauthorized", 401, "UNAUTHORIZED");
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("sets isOperational to true", () => {
    const err = new AppError("Bad request", 400, "BAD_REQUEST");
    expect(err.isOperational).toBe(true);
  });

  it("is an instance of Error", () => {
    const err = new AppError("Server error", 500, "SERVER_ERROR");
    expect(err).toBeInstanceOf(Error);
  });

  it("has a stack trace", () => {
    const err = new AppError("Error with stack", 500, "STACK_TEST");
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe("string");
  });

  it("defaults code to ERROR when no code is provided", () => {
    const err = new AppError("Something went wrong", 500);
    expect(err.code).toBe("ERROR");
  });
});

// ---------------------------------------------------------------------------
// apiResponse
// ---------------------------------------------------------------------------
describe("apiResponse", () => {
  describe("success()", () => {
    it("returns success: true", () => {
      const res = apiResponse.success({ id: 1 }, "Created");
      expect(res.success).toBe(true);
    });

    it("returns the provided data", () => {
      const data = { id: 1, name: "test" };
      const res = apiResponse.success(data, "OK");
      expect(res.data).toEqual(data);
    });

    it("returns the provided message", () => {
      const res = apiResponse.success({}, "User created");
      expect(res.message).toBe("User created");
    });

    it("defaults message to 'Success'", () => {
      const res = apiResponse.success({});
      expect(res.message).toBe("Success");
    });

    it("does not include an error key", () => {
      const res = apiResponse.success({});
      expect(res.error).toBeUndefined();
    });
  });

  describe("error()", () => {
    it("returns success: false", () => {
      const res = apiResponse.error("Not found", "NOT_FOUND");
      expect(res.success).toBe(false);
    });

    it("returns error object with code and message", () => {
      const res = apiResponse.error("Not found", "NOT_FOUND");
      expect(res.error).toEqual({ code: "NOT_FOUND", message: "Not found" });
    });

    it("defaults code to ERROR", () => {
      const res = apiResponse.error("Something went wrong");
      expect(res.error.code).toBe("ERROR");
    });

    it("does not include a data key", () => {
      const res = apiResponse.error("Oops", "OOPS");
      expect(res.data).toBeUndefined();
    });
  });

  describe("paginated()", () => {
    it("returns success: true", () => {
      const res = apiResponse.paginated([], { page: 1, total: 0 });
      expect(res.success).toBe(true);
    });

    it("returns the provided data array", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const res = apiResponse.paginated(data, { page: 1, total: 2 });
      expect(res.data).toEqual(data);
    });

    it("returns the pagination object", () => {
      const pagination = { page: 2, limit: 10, total: 50, hasNext: true };
      const res = apiResponse.paginated([], pagination);
      expect(res.pagination).toEqual(pagination);
    });

    it("returns the provided message", () => {
      const res = apiResponse.paginated([], {}, "Posts fetched");
      expect(res.message).toBe("Posts fetched");
    });

    it("defaults message to 'Success'", () => {
      const res = apiResponse.paginated([], {});
      expect(res.message).toBe("Success");
    });
  });
});

// ---------------------------------------------------------------------------
// catchAsync
// ---------------------------------------------------------------------------
describe("catchAsync", () => {
  it("calls the wrapped function with req, res, next", async () => {
    const handler = jest.fn().mockResolvedValue("ok");
    const wrapped = catchAsync(handler);
    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next(err) when the wrapped function rejects", async () => {
    const error = new Error("Async failure");
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = catchAsync(handler);
    const next = jest.fn();

    await wrapped({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("calls next(err) with AppError when thrown", async () => {
    const appError = new AppError("Not found", 404, "NOT_FOUND");
    const handler = jest.fn().mockRejectedValue(appError);
    const wrapped = catchAsync(handler);
    const next = jest.fn();

    await wrapped({}, {}, next);

    expect(next).toHaveBeenCalledWith(appError);
    const receivedErr = next.mock.calls[0][0];
    expect(receivedErr.statusCode).toBe(404);
    expect(receivedErr.isOperational).toBe(true);
  });

  it("does not call next when the wrapped function resolves successfully", async () => {
    const handler = jest.fn(async (req, res) => {
      res.sent = true;
    });
    const wrapped = catchAsync(handler);
    const res = {};
    const next = jest.fn();

    await wrapped({}, res, next);

    expect(res.sent).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});
