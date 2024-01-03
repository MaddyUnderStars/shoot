export const createXsdDate = (date = new Date) => {
	return date.toISOString() + "+" +(date.getTimezoneOffset() / 60) + ":00"
}