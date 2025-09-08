import { z } from "zod";

export const SubmissionStatus = z.enum([
	"queued",
	"running",
	"accepted",
	"wrong_answer",
	"runtime_error",
	"compile_error",
	"internal_error",
]);
export const Language = z.enum(["c", "cpp23"]);

export const SubmissionDto = z.object({
	submissionId: z.string(),
	userId: z.string(),
	problemId: z.string(),
	status: SubmissionStatus,
	language: Language.optional(),
	timeLimitMs: z.number().int().optional(),
	memoryLimitKb: z.number().int().optional(),
	runTimeMs: z.number().int().nullable().optional(),
	runMemoryKb: z.number().int().nullable().optional(),
	createdAt: z.number().int(),
	updatedAt: z.number().int().optional(),
});
export type SubmissionDto = z.infer<typeof SubmissionDto>;

export const QueueSubmissionV1 = z.object({
	schema: z.literal("unitn-oj.submission.v1"),
	submissionId: z.string(),
	userId: z.string(),
	courseId: z.string().optional(),
	problemId: z.string(),
	language: Language.optional(),
	codeRef: z.object({ kind: z.enum(["inline", "r2"]) }).passthrough(),
	timeLimitMs: z.number().int().optional(),
	memoryLimitKb: z.number().int().optional(),
	createdAt: z.number().int(),
});
export type QueueSubmissionV1 = z.infer<typeof QueueSubmissionV1>;
