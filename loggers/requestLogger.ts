

import { NextFunction, RequestHandler, Response } from "express";
import { appendFile } from "fs/promises";
import chalk from "chalk";
import { CustomRequest } from "../types.js";
import { generateId } from "../utils/generateId.js";

/**
 * A middleware that logs the request in the console and in the "requests.log" file
*/

export const requestLogger: RequestHandler = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    const line: string = "\n";
    const path: string = process.cwd() + "/logs/requests.log";
    req.id = await generateId();

    try {

        req.startTime = new Date()

        console.log(line)
        console.log(chalk.bgBlue(`Id : ${req.id}`))
        console.log(chalk.yellow(`${new Date().toString()}`))
        console.log(chalk.magenta(`Request from ${req.ip}`))
        console.log(chalk.blue(`Method :  ${req.method}`))
        console.log(chalk.blue(`Protocol :  ${req.protocol}`))
        console.log(chalk.bold(`Body :  ${JSON.stringify(req.body)}`))
        console.log(chalk.bold(`Queries :  ${JSON.stringify(req.query)}`))
        console.log(chalk.bold(`Parameters :  ${JSON.stringify(req.params)}`))
        console.log((`Path : ${req.path}`))
        console.log(chalk.redBright(`User Agent :  ${JSON.stringify(req.headers["user-agent"])} `))
        console.log(chalk.red(`Headers :  ${JSON.stringify(req.headers)}`))
        console.log(line)

        const log =  line
        + `Id : ${req.id}`
        + line
        + (`${new Date().toString()}`)
        + line
        + (`Request from ${req.ip}`)
        + line
        + (`Method :  ${req.method}`)
        + line
        + (`Protocol :  ${req.protocol}`)
        + line
        + (`Body :  ${JSON.stringify(req.body)}`)
        + line
        + (`Queries :  ${JSON.stringify(req.query)}`)
        + line
        + (`Parameters :  ${JSON.stringify(req.params)}`)
        + line
        + (`Path :  ${req.path}`)
        + line
        + (`User Agent :  ${JSON.stringify(req.headers["user-agent"])}`)
        + line
        + (`Headers :  ${JSON.stringify(req.headers)}`)
        + line

        await appendFile(path,log)
    }

    catch (err) {
        next(err)
        return;
    }

    next()

}