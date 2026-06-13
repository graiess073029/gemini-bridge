 

/**
 * Main file of the project
 * 
 * This file is the main entry point of the project.
 * It launches the server and sets up the port.
*/


import { log } from "./utils/log.js";
import server from "./app.js";
import { config } from './config/config.js';


server.listen(config.server.serverPort,config.server.host, async () =>
    {
        await log("Server in action")
    })