const base = "http://localhost:5000";
const id = Date.now();
const email = `user${id}@example.com`;
const password = "password123";

async function main() {
  const regRes = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: `user${id}`, email, password })
  });
  const regBody = await regRes.text();
  console.log("REGISTER", regRes.status, regBody);

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const loginBodyText = await loginRes.text();
  console.log("LOGIN", loginRes.status, loginBodyText);

  let token = "";
  try { token = JSON.parse(loginBodyText).token || ""; } catch {}
  if (!token) return;

  const postRes = await fetch(`${base}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ content: `test post ${id}` })
  });
  const postBody = await postRes.text();
  console.log("CREATE_POST", postRes.status, postBody);
}

main().catch((err) => {
  console.error("SCRIPT_ERROR", err.message);
  process.exit(1);
});
