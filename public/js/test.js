document.getElementById("register").onclick = async () => {
  const res = await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test", password: "12345" })
  });
  console.log(await res.json());
};

document.getElementById("login").onclick = async () => {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "test", password: "12345" })
  });
  console.log(await res.json());
};
