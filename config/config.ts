import dotenv from 'dotenv';
import { appConfig } from "../types.js";

/**
 * This file contains the configuration for the application.
 * The configuration is loaded from the .env file.
 * @module config
 */


dotenv.config()

export const config: appConfig = {

    server: {
        serverPort: Number(process.env.SERVER_PORT),
        host: process.env.SERVER_HOST || "",
        secretKey: process.env.SECRET_KEY || "^AtfVfvjèMybXr(g$P24)"
    },

    apiKey: process.env.GEMINI_API_KEY || ""

}

console.log(config.server.serverPort)