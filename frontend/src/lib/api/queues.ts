export interface CfQueue {
	send: (msg: unknown) => Promise<void>;
}

export async function sendSubmissionJob(
	queue: CfQueue,
	job: unknown,
): Promise<void> {
	await queue.send(job);
}
