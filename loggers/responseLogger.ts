
import { log } from '../utils/log.js';
import { appendFile } from "fs/promises";
import chalk from "chalk";
import { NextFunction, RequestHandler } from "express";
import { CustomResponse } from "../types.js";
import { CustomRequest } from "../types.js";

/**
 * Logs the request in the console and in the "requests.log" file after the response has been sent.
 */

export const responseLogger : RequestHandler = async (req: CustomRequest, res: CustomResponse, next: NextFunction): Promise<void> => {
        
    const line: string = "\n";
        const path: string = process.cwd() + "/logs/requests.log";

        const process_time: number | undefined = req.startTime?.getTime() ? new Date().getTime() - req.startTime?.getTime() : undefined

        try {

            if (res.headersSent) {
                console.log(line)
                console.log(chalk.bgBlue(`Id : ${req.id}`))
                console.log(chalk.bgWhite(process_time + "ms"))
                console.log(chalk.red(`Status code :  ${(res.statusCode)}`))
                console.log(chalk.yellow(`State :  ${(res.body?.state)}`))
                console.log(chalk.magenta(`Message :  ${(JSON.stringify(res.body?.message))}`))
                console.log(line)

                const log = line
                    + `Id : ${req.id}`
                    + line
                    + `Status code :  ${(res.statusCode)}`
                    + line
                    + `State :  ${(res.body?.state)}`
                    + line
                    + `Message :  ${(JSON.stringify(res.body?.message))}`
                    + line
                    + line

                await appendFile(path, log)

                return

            }

            next()

        }

        catch (err) {
            await log((err as Error).message, "error");
            return;
        }


}