import { problemFrom } from "$lib/api/http";

export async function sendEmail(
	apiKey: string,
	from: string,
	to: string,
	subject: string,
	html: string,
) {
	const r = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			authorization: `Bearer ${apiKey}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({ from, to, subject, html }),
	});
	if (!r.ok) throw problemFrom("INTERNAL", { detail: "send email failed" });
}
