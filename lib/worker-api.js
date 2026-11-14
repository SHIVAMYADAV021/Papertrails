
require("dotenv").config({ path: ".env.local" });

const WORKER_URL = "https://paper-trails-api.sy0091958.workers.dev";

async function callWorker(path, method = "GET", body) {
  const secret = process.env.WORKER_API_SECRET;

  if (!secret) {
    throw new Error("WORKER_API_SECRET is not configured in the local environment.");
  }

  const response = await fetch(`${WORKER_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Secret": secret
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.error || `Book service returned ${response.status}.`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

module.exports = { callWorker };
