/**
 * Achievement service — evaluates triggers and awards badges idempotently.
 *
 * Each `check*` function is best-effort: errors are logged but never crash
 * the calling flow. Awarding creates the Achievement (unique index prevents
 * doubles) and a corresponding Notification.
 */

const Achievement = require("../models/Achievement");
const Notification = require("../models/Notification");
const Post = require("../models/Post");
const Ride = require("../models/Ride");
const Bike = require("../models/Bike");
const Club = require("../models/Club");
const User = require("../models/User");

const META = {
  FIRST_POST:    { label: "First Post",        emoji: "📝", message: "You earned: First Post!" },
  FIRST_RIDE:    { label: "First Ride",        emoji: "🏍",  message: "You earned: First Ride!" },
  RIDE_100KM:    { label: "Century",           emoji: "💯", message: "You earned: Century — first 100km ride!" },
  RIDE_500KM:    { label: "Long Hauler",       emoji: "🛣",  message: "You earned: Long Hauler — first 500km ride!" },
  TOTAL_1000KM:  { label: "Roadwarrior",       emoji: "🏆", message: "You earned: Roadwarrior — 1000km lifetime!" },
  JOIN_3_CLUBS:  { label: "Networker",         emoji: "🤝", message: "You earned: Networker — joined 3 clubs!" },
  BIKE_COLLECTOR:{ label: "Collector",         emoji: "🏁", message: "You earned: Collector — 5 bikes!" },
  EARLY_BIRD:    { label: "Early Bird",        emoji: "🌅", message: "You earned: Early Bird — among the first 100 users!" }
};

async function award(userId, type) {
  if (!META[type]) return false;
  try {
    // Atomic insert; unique index makes this idempotent
    await Achievement.create({ user: userId, type });
  } catch (err) {
    if (err && err.code === 11000) return false; // already awarded
    console.warn(`[achievement] award ${type} failed:`, err.message);
    return false;
  }
  try {
    await Notification.create({
      recipient: userId,
      type: "achievement",
      // No sender — system-generated
    });
  } catch (err) {
    console.warn(`[achievement] notify ${type} failed:`, err.message);
  }
  return true;
}

/* ── Trigger checks ──────────────────────────────────────────── */

async function checkFirstPost(userId) {
  const count = await Post.countDocuments({ author: userId });
  if (count === 1) await award(userId, "FIRST_POST");
}

async function checkRideMilestones(userId, ride) {
  // FIRST_RIDE — first ride this user has joined
  const totalJoined = await Ride.countDocuments({ participants: userId });
  if (totalJoined === 1) await award(userId, "FIRST_RIDE");

  // Distance milestones — only meaningful on completed rides
  if (ride && ride.status === "completed" && Number.isFinite(ride.totalDistance)) {
    if (ride.totalDistance >= 100) await award(userId, "RIDE_100KM");
    if (ride.totalDistance >= 500) await award(userId, "RIDE_500KM");

    // TOTAL_1000KM — sum of distances across all completed rides this user took part in
    const agg = await Ride.aggregate([
      { $match: { status: "completed", participants: userId, totalDistance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$totalDistance" } } }
    ]);
    const total = agg?.[0]?.total || 0;
    if (total >= 1000) await award(userId, "TOTAL_1000KM");
  }
}

async function checkClubsJoined(userId) {
  const count = await Club.countDocuments({ members: userId });
  if (count >= 3) await award(userId, "JOIN_3_CLUBS");
}

async function checkBikeCollector(userId) {
  const count = await Bike.countDocuments({ owner: userId });
  if (count >= 5) await award(userId, "BIKE_COLLECTOR");
}

async function checkEarlyBird(userId) {
  // Cheap heuristic — count users with createdAt earlier than this user
  const me = await User.findById(userId).select("createdAt").lean();
  if (!me?.createdAt) return;
  const earlierCount = await User.countDocuments({ createdAt: { $lt: me.createdAt } });
  if (earlierCount < 100) await award(userId, "EARLY_BIRD");
}

/* ── Listing ─────────────────────────────────────────────────── */

async function listForUser(userId) {
  const earned = await Achievement.find({ user: userId }).sort({ awardedAt: -1 }).lean();
  const earnedSet = new Set(earned.map((a) => a.type));

  return Object.keys(META).map((type) => {
    const a = earned.find((x) => x.type === type);
    return {
      type,
      label: META[type].label,
      emoji: META[type].emoji,
      earned: earnedSet.has(type),
      awardedAt: a?.awardedAt || null
    };
  });
}

module.exports = {
  award,
  checkFirstPost,
  checkRideMilestones,
  checkClubsJoined,
  checkBikeCollector,
  checkEarlyBird,
  listForUser,
  META
};
