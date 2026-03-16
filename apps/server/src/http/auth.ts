import type { IncomingMessage } from "node:http";

export function isAuthorizedMutation(request: IncomingMessage, adminToken: string | null) {
  if (!adminToken) {
    return true;
  }

  return request.headers.authorization === `Bearer ${adminToken}`;
}
