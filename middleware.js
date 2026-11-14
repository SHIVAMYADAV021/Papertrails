
import crypto from "node:crypto";
import dotenv from "dotenv";
import { next } from "@vercel/functions";

// Load local environment variables during development.
// On Vercel, production environment variables are used.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.local" });
}

export const config = {
  runtime: "nodejs",
  matcher: ["/admin/dashboard.html", "/admin/books.html"]
};

export default function middleware(request) {
  const cookie = request.headers.get("cookie") || "";

  const token = cookie
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("pt_admin_session="))
    ?.slice("pt_admin_session=".length);

  const secret = process.env.SESSION_SECRET;

  if (!token || !secret) {
    return Response.redirect(
      new URL("/admin/login.html", request.url),
      302
    );
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return Response.redirect(
      new URL("/admin/login.html", request.url),
      302
    );
  }

  const [payload, signature] = parts;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    received.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(received, expectedBuffer)
  ) {
    return Response.redirect(
      new URL("/admin/login.html", request.url),
      302
    );
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      session.admin !== true ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      throw new Error("Invalid session");
    }

    return next();
  } catch {
    return Response.redirect(
      new URL("/admin/login.html", request.url),
      302
    );
  }
}
