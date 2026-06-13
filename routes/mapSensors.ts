import { config } from "../config/config.js";
import type { NextFunction } from "express";
import { CustomRequest, CustomResponse, GeminiResponse, HttpResponse, LabelMapping } from "../types.js";
import { z } from 'zod';
import {buildPrompt} from "../utils/buildPrompt.js";
import { validateLabelMapping } from "../utils/validateMapping.js";
import { extractJson } from "../utils/extractJson.js";


const candidatesSchema = z.array(z.object({
    index: z.coerce.number(),
    label: z.string(),
    unit: z.string(),
    type: z.string(),
    group: z.string(),
    sensorId: z.number()
}));


export const mapSensors = async (req: CustomRequest, res: CustomResponse, next: NextFunction): Promise<any> => {
    try {


        if (req.body?.secretKey !== config.server.secretKey) {

            let response: HttpResponse = {
                state: 'error',
                message: "Invalid secret key"
            };

            res.status(401).json(response);
            res.body = response;
            next();
            return;

        }

        const candidates = req.body?.candidates;

        if (!candidates || !candidatesSchema.safeParse(candidates).success) {

            let response: HttpResponse = {
                state: 'error',
                message: "Invalid candidates"
            };

            res.status(400).json(response);
            res.body = response;
            next();
            return;
        }

        const startDate = new Date();
        console.log("Mapping sensors with AI...");

        
        const prompt = buildPrompt(candidates);


        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0,
                        responseMimeType: "application/json",
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            throw new Error(`Gemini API Error: ${geminiResponse.status} ${await geminiResponse.text()}`);
        }

        const data = (await geminiResponse.json()) as GeminiResponse;
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) throw new Error("Gemini returned empty response");

        const cleanJson = extractJson(rawText);

        let labelMapping: LabelMapping;
        try {
            labelMapping = JSON.parse(cleanJson);
        } catch {

            throw new Error("Gemini returned invalid JSON:" + cleanJson);
        }

        validateLabelMapping(labelMapping);

        const endDate = new Date();
        console.log(
            `Sensor mapping took ${(endDate.getTime() - startDate.getTime()) / 1000} seconds.`
        );
        console.log(JSON.stringify(labelMapping, null, 2));
        console.log("Sensor mapping completed successfully.");



        let response: HttpResponse = {
            state: "success",
            message: "Sensor mapping completed successfully.",
            data: labelMapping
        };

        res.status(200).json(response);
        res.body = response;
        next();


    }

    catch (err) {
        next(err);
    }
}