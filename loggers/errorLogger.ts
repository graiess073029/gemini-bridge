
import { NextFunction, Request, ErrorRequestHandler } from "express";
import { appendFile } from "fs/promises";
import { CustomResponse, HttpResponse } from "../types.js";

/**
 * Error logging middleware for Express applications.
 *
 * This middleware function logs error details to a file and sends a 
 * response to the client if headers have not been sent. It logs the 
 * error name, message, stack, and cause to a designated error log file.
 */

export const errorLogger : ErrorRequestHandler = async (err : Error , req : Request , res : CustomResponse , next : NextFunction) : Promise<void> =>{
    const line : string = "\n";
    const path : string = process.cwd() + "/logs/error.log";

    try {
        

        if (!err) next();

        console.log(err)

        const log : string = line
        +(`${new Date().toString()} `)
        +(`Name :  ${err.name} `)
        +(`Message :  ${err.message}`)
        + typeof err.stack === 'string' ? `Stack :  ${err.stack}` : "null"
        + typeof err.cause === 'string' ? `Cause :  ${err.cause} ` : "null"
        +line

        await appendFile(path, log);

        if (!res.headersSent){
            let response : HttpResponse = {
                message : "An internal server error has occured",
                state : "error"
            }
    
            res.status(500).json(response)
            res.body = response
            next();
        }


    }

    catch(err){
        next()
    }

    return ;
}