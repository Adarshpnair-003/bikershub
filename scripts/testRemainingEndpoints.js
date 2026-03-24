const BASE = process.env.BASE_URL || "http://localhost:5002/api";

function uniqueId(prefix = "u") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function api(path, { method = "GET", token, body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    // keep raw text
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

const results = [];

async function step(name, fn, { required = true } = {}) {
  try {
    const output = await fn();
    const pass = output && output.ok === true;
    results.push({ name, pass, status: output?.status, data: output?.data, required });
    const marker = pass ? "PASS" : required ? "FAIL" : "WARN";
    console.log(`${marker} | ${name} | status=${output?.status}`);
    if (!pass && output?.data) {
      console.log(`  -> ${JSON.stringify(output.data)}`);
    }
    return output;
  } catch (error) {
    results.push({ name, pass: false, status: "ERR", data: { error: error.message }, required });
    const marker = required ? "FAIL" : "WARN";
    console.log(`${marker} | ${name} | status=ERR`);
    console.log(`  -> ${error.message}`);
    return null;
  }
}

function payload(result) {
  const body = result?.data;

  if (body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "data")) {
    return body.data;
  }

  return body;
}

function summary() {
  const requiredFails = results.filter((r) => r.required && !r.pass);
  const optionalFails = results.filter((r) => !r.required && !r.pass);

  console.log("\n========== SUMMARY ==========");
  console.log(`Total steps: ${results.length}`);
  console.log(`Required failures: ${requiredFails.length}`);
  console.log(`Optional warnings: ${optionalFails.length}`);

  if (requiredFails.length > 0) {
    console.log("\nFailed required steps:");
    for (const f of requiredFails) {
      console.log(`- ${f.name} (status=${f.status})`);
    }
    process.exitCode = 1;
  }
}

async function run() {
  const emailA = `${uniqueId("a")}@example.com`;
  const emailB = `${uniqueId("b")}@example.com`;
  const pass = "Passw0rd!";
  const usernameA = uniqueId("alpha");
  const usernameB = uniqueId("beta");

  const registerA = await step("auth register user A", () =>
    api("/auth/register", {
      method: "POST",
      body: { name: "User A", username: usernameA, email: emailA, password: pass }
    })
  );

  const registerB = await step("auth register user B", () =>
    api("/auth/register", {
      method: "POST",
      body: { name: "User B", username: usernameB, email: emailB, password: pass }
    })
  );

  const loginA = await step("auth login user A", () =>
    api("/auth/login", {
      method: "POST",
      body: { email: emailA, password: pass }
    })
  );

  const loginB = await step("auth login user B", () =>
    api("/auth/login", {
      method: "POST",
      body: { email: emailB, password: pass }
    })
  );

  const loginPayloadA = payload(loginA);
  const loginPayloadB = payload(loginB);

  const tokenA = loginPayloadA?.token;
  const tokenB = loginPayloadB?.token;
  const userA = loginPayloadA?.user?.id;
  const userB = loginPayloadB?.user?.id;

  if (!tokenA || !tokenB || !userA || !userB) {
    console.log("Cannot continue; auth bootstrap failed.");
    summary();
    return;
  }

  await step("users me", () => api("/users/me", { token: tokenA }));
  await step("users profile", () => api(`/users/${userB}`, { token: tokenA }));
  await step("users follow", () => api(`/users/follow/${userB}`, { method: "PUT", token: tokenA }));
  await step("users unfollow", () => api(`/users/unfollow/${userB}`, { method: "PUT", token: tokenA }));

  const createPost = await step("posts create", () =>
    api("/posts", {
      method: "POST",
      token: tokenA,
      body: { content: "Smoke test post" }
    })
  );

  const postId = payload(createPost)?._id;

  await step("posts get all", () => api("/posts", { token: tokenA }));
  await step("posts smart feed", () => api("/posts/feed", { token: tokenA }));

  if (postId) {
    await step("posts like", () => api(`/posts/like/${postId}`, { method: "PUT", token: tokenB }));

    const createComment = await step("comments create", () =>
      api(`/comments/${postId}`, {
        method: "POST",
        token: tokenB,
        body: { content: "Smoke test comment" }
      })
    );

    await step("comments list", () => api(`/comments/${postId}`, { token: tokenA }));

    const commentId = payload(createComment)?._id;
    if (commentId) {
      await step("comments like", () => api(`/comments/like/${commentId}`, { method: "PUT", token: tokenA }));
      await step("comments delete", () => api(`/comments/${commentId}`, { method: "DELETE", token: tokenA }));
    }

    await step("posts update", () =>
      api(`/posts/${postId}`, {
        method: "PUT",
        token: tokenA,
        body: { content: "Updated smoke test post" }
      })
    );
  }

  await step("notifications list", () => api("/notifications", { token: tokenA }));
  await step("notifications unread count", () => api("/notifications/unread-count", { token: tokenA }));
  await step("notifications mark all read", () => api("/notifications/read-all", { method: "PUT", token: tokenA }));

  const clubName = uniqueId("club");
  const createClub = await step("clubs create", () =>
    api("/clubs", {
      method: "POST",
      token: tokenA,
      body: {
        name: clubName,
        description: "Smoke club",
        location: "Bangalore",
        isPrivate: true
      }
    })
  );

  const clubId = payload(createClub)?._id;

  if (clubId) {
    await step("clubs request join", () => api(`/clubs/${clubId}/join`, { method: "POST", token: tokenB }));
    await step("clubs get requests", () => api(`/clubs/${clubId}/requests`, { token: tokenA }));
    await step("clubs approve request", () => api(`/clubs/approve/${clubId}/${userB}`, { method: "PUT", token: tokenA }));
    await step("clubs create post", () =>
      api(`/clubs/${clubId}/post`, {
        method: "POST",
        token: tokenB,
        body: { content: "Club post from smoke test" }
      })
    );
    await step("clubs get posts", () => api(`/clubs/${clubId}/posts`, { token: tokenA }));
    await step("clubs get details", () => api(`/clubs/${clubId}`, { token: tokenA }));
    await step("clubs leave", () => api(`/clubs/leave/${clubId}`, { method: "PUT", token: tokenB }));
  }

  const createRide = await step("rides create", () =>
    api("/rides", {
      method: "POST",
      token: tokenA,
      body: {
        title: uniqueId("ride"),
        description: "Smoke ride",
        startLocation: "Bangalore, India",
        destination: "Mysore, India",
        rideDate: new Date(Date.now() + 86400000).toISOString(),
        maxParticipants: 10
      }
    }),
    { required: false }
  );

  const ridePayload = payload(createRide);
  const rideId = ridePayload?.ride?._id || ridePayload?._id;

  await step("rides get all", () => api("/rides", { token: tokenA }));

  if (rideId) {
    await step("rides get single", () => api(`/rides/${rideId}`, { token: tokenA }));
    await step("rides join", () => api(`/rides/join/${rideId}`, { method: "POST", token: tokenB }));
    await step("rides start", () => api(`/rides/${rideId}/start`, { method: "PUT", token: tokenA }));
    await step("rides update location 1", () => api(`/rides/${rideId}/location`, { method: "PUT", token: tokenA, body: { lat: 12.9716, lng: 77.5946 } }));
    await step("rides update location 2", () => api(`/rides/${rideId}/location`, { method: "PUT", token: tokenA, body: { lat: 12.9725, lng: 77.605 } }));
    await step("rides route", () => api(`/rides/${rideId}/route`, { token: tokenA }));
    await step("rides locations", () => api(`/rides/${rideId}/locations`, { token: tokenA }));
    await step("rides end", () => api(`/rides/${rideId}/end`, { method: "PUT", token: tokenA }));
    await step("rides invite", () => api(`/rides/invite/${rideId}/${userB}`, { method: "POST", token: tokenA }));
    await step("rides leave", () => api(`/rides/leave/${rideId}`, { method: "POST", token: tokenB }));
  }

  await step("search global", () => api(`/search?q=${encodeURIComponent(usernameA)}`));

  const conversation = await step("conversations create/get", () =>
    api("/conversations", {
      method: "POST",
      token: tokenA,
      body: { userId: userB }
    })
  );

  const conversationId = payload(conversation)?._id;

  await step("conversations list mine", () => api("/conversations", { token: tokenA }));

  if (conversationId) {
    await step("conversations get by id", () => api(`/conversations/${conversationId}`, { token: tokenA }));
    await step("chat send", () =>
      api("/chat/send", {
        method: "POST",
        token: tokenA,
        body: { conversationId, text: "Hello from smoke test" }
      })
    );
    await step("chat get messages", () => api(`/chat/conversation/${conversationId}`, { token: tokenA }));
    await step("chat unread count", () => api("/chat/unread", { token: tokenB }));
    await step("chat mark read", () => api(`/chat/read/${conversationId}`, { method: "PUT", token: tokenB }));
  }

  if (postId) {
    await step("posts delete", () => api(`/posts/${postId}`, { method: "DELETE", token: tokenA }));
  }

  summary();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
