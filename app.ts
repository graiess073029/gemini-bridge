
import { createServer, Server } from 'http';
import { errorLogger } from './loggers/errorLogger.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import express, { Application, NextFunction, Request } from "express"
import { HttpResponse, CustomResponse } from './types.js';
import { requestLogger } from './loggers/requestLogger.js';
import { responseLogger } from './loggers/responseLogger.js';
import { mapSensors } from './routes/mapSensors.js';

// Initializing the express application and the server
const app: Application = express()
let server: Server  = createServer(app)

// Setting up middlewares options

const corsOptions = {
    methods: 'POST',
    credentials: true,
    optionsSuccessStatus: 200
};

const rateLimitOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { state: 'error', message: '5rit fih rahou. Chwn ha zebi aaref blstk', statusCode: 401, link: "" },
    standardHeaders: true,
    legacyHeaders: false,
}

// Setting up middlewares

app.use(requestLogger)
app.use(helmet())
app.use(rateLimit(rateLimitOptions))
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

// Setting up routes

app.get("/", async (req: Request, res: CustomResponse, next: NextFunction): Promise<any> => {

    let response: HttpResponse = {
        state: "success",
        message: "Api working without isssues"
    }

    res.body = response
    res.json(response)
    next()
    return;
})


app.post("/mapSensors",mapSensors)

// Error and response logging middleweare

app.use(errorLogger)
app.use(responseLogger)

app.set("trust proxy", 1);

export default server;
