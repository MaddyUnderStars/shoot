const errors = document.getElementById("errors");
const form = document.forms[0];

form.addEventListener("submit", async (e) => {
	errors.className = "hidden";
	e.preventDefault();

	const data = new FormData(e.target);

	const res = await fetch("/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username: data.get("username"),
			password: data.get("password"),
		}),
	});

	if (!res.ok) {
		const error = await res.json();
		errors.innerText = error.message;
		errors.className = "";
		return;
	}

	const a = document.createElement("a");
	a.setAttribute("href", "https://shoot.pub");
	a.classList.add("underline");
	a.innerText = "your Shoot client";

	form.innerHTML = `You're registered! Go back to ${a.outerHTML} and login to continue.`;
});
