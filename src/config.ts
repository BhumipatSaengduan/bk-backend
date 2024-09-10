import "dotenv/config";

export interface Configuration {
  port: number;
  jwtSecret: string;
  allowedOrigins: string | string[];
  uploadDir: string;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  googleOAuth: {
    clientId: string;
    clientSecret: string;
  };
}

const REQUIRED_ENVS = ["JWT_SECRET", "CORS_ALLOWED_ORIGINS", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];

export function getConfig(): Configuration {
  for (const env of REQUIRED_ENVS) requireEnv(env);

  /* CORS */
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "").split(",");
  /* CORS */

  const config: Configuration = {
    port: getEnvNumber("PORT") || 3000,
    jwtSecret: process.env.JWT_SECRET!,
    allowedOrigins,
    uploadDir: process.env.UPLOAD_FOLDER_NAME || "uploads",
    database: {
      host: process.env.DB_HOST!,
      port: getEnvNumber("DB_PORT") || 5432,
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      name: process.env.DB_NAME!,
    },
    googleOAuth: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    },
  };

  return config;
}

function requireEnv(name: string) {
  const raw = process.env[name] ?? "";
  if (!raw.trim()) throw new Error(`${name} is unset or empty`);
}

function getEnvNumber(name: string): number | undefined {
  const raw = process.env[name] ?? "";
  if (raw.trim() !== "") {
    try {
      return parseInt(raw!, 10);
    } catch (e: any) {
      throw new Error(`${name} is not a number`);
    }
  }
}
