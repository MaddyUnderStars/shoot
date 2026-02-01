export const getTestString = () =>
	Math.random()
		.toString()
		.split(".")[1]
		.split("")
		.map((x) => String.fromCharCode(Number.parseInt(x, 10) + 97))
		.join("");
