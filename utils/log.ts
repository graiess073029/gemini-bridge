import chalk from "chalk";
import { appendFile } from "fs/promises";


/**
 * Logs a message to the console and to a file.
 *
 * @param {string} message the message to log
 * @param {string} [fileName='info'] the name of the file to log to
 *
 */


export const log = async (message: string, fileName: string = 'info'): Promise<void> => {
    const line: string = "\n";
    const path: string = process.cwd() + "/logs/" + fileName + ".log";

    try {

        if (fileName === "error") {
            console.log(line)
            console.log(chalk.red((`${new Date().toString()}`)))
            console.log(chalk.red(message))
            console.log(line)
        }

        else {
            console.log(line)
            console.log((`${new Date().toString()}`))
            console.log(message)
            console.log(line)
        }

        if (fileName) {
            const log = line
                + (`${new Date().toString()}`)
                + message
                + line

            await appendFile(path, log)
        }

        return ;

    }

    catch (err) {
        return ;
    }

}