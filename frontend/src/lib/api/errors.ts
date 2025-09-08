export const ERROR_KINDS = {
	INVALID_ARGUMENT: {
		http: 400,
		grpc: "INVALID_ARGUMENT",
		title: "Invalid argument",
		type: "https://oj.yifen9.li/problems/invalid-argument",
	},
	FAILED_PRECONDITION: {
		http: 412,
		grpc: "FAILED_PRECONDITION",
		title: "Failed precondition",
		type: "https://oj.yifen9.li/problems/failed-precondition",
	},
	UNAUTHENTICATED: {
		http: 401,
		grpc: "UNAUTHENTICATED",
		title: "Unauthenticated",
		type: "https://oj.yifen9.li/problems/unauthenticated",
	},
	PERMISSION_DENIED: {
		http: 403,
		grpc: "PERMISSION_DENIED",
		title: "Permission denied",
		type: "https://oj.yifen9.li/problems/permission-denied",
	},
	NOT_FOUND: {
		http: 404,
		grpc: "NOT_FOUND",
		title: "Not found",
		type: "https://oj.yifen9.li/problems/not-found",
	},
	RESOURCE_EXHAUSTED: {
		http: 429,
		grpc: "RESOURCE_EXHAUSTED",
		title: "Rate limit exceeded",
		type: "https://oj.yifen9.li/problems/rate-limit",
	},
	INTERNAL: {
		http: 500,
		grpc: "INTERNAL",
		title: "Internal error",
		type: "https://oj.yifen9.li/problems/internal",
	},
} as const;
export type ErrorKind = keyof typeof ERROR_KINDS;
