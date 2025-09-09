export function clientIp(req: Request): string {
	const cfc = req.headers.get("cf-connecting-ip") ?? "";
	if (cfc) return cfc.trim();
	const xff = req.headers.get("x-forwarded-for") ?? "";
	if (xff) {
		const [first = ""] = xff.split(",");
		return first.trim();
	}
	return "";
}

export function userAgent(req: Request): string {
	return req.headers.get("user-agent") ?? "";
}
