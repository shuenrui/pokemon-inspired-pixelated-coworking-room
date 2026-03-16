export type ServerConfig = {
  port: number;
  webDistDir: string;
  adminToken: string | null;
  allowOrigin: string;
};

export function getServerConfig(defaultWebDistDir: string): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 8787),
    webDistDir: process.env.WEB_DIST_DIR ?? defaultWebDistDir,
    adminToken: process.env.ADMIN_TOKEN ?? null,
    allowOrigin: process.env.ALLOW_ORIGIN ?? "*"
  };
}
