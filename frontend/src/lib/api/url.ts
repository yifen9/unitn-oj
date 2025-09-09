export function buildMagicLink(req: Request, token: string) {
	const u = new URL(req.url);
	u.pathname = "/auth/continue";
	u.search = "";
	u.searchParams.set("token", token);
	return u.toString();
}
