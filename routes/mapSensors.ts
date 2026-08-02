import { config } from "../config/config.js";
import type { NextFunction } from "express";
import { CustomRequest, CustomResponse, HttpResponse, LabelMapping } from "../types.js";
import { z } from 'zod';
import { buildPrompt } from "../utils/buildPrompt.js";
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

const GEMINI_TIMEOUT_MS = 180_000;

export const mapSensors = async (req: CustomRequest, res: CustomResponse, next: NextFunction): Promise<void> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const log = (msg: string) => console.log(`[${requestId}] ${msg}`);

    try {
        if (req.body?.secretKey !== config.server.secretKey) {
            log("Auth failed — invalid secret key");
            res.status(401).json({ state: 'error', message: "Invalid secret key" });
            return;
        }

        const candidates = req.body?.candidates;
        const parseResult = candidatesSchema.safeParse(candidates);
        if (!parseResult.success) {
            log(`Invalid candidates: ${parseResult.error.message}`);
            res.status(400).json({ state: 'error', message: "Invalid candidates format" });
            return;
        }

        log(`Mapping ${candidates.length} sensors with AI...`);
        log(JSON.stringify(candidates))

        const prompt = buildPrompt(candidates);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

        let geminiResponse: Response;
        try {
            geminiResponse = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/interactions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": config.apiKey,
                    },
                    body: JSON.stringify({
                        model: "gemini-3.6-flash",
                        input: prompt,
                        response_format: {
                            type: "text",
                            mime_type: "application/json",
                        },
                        generation_config: {
                            temperature: 0,
                        },
                    }),
                    signal: controller.signal,
                }
            );
        } finally {
            clearTimeout(timeoutId);
        }

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API HTTP ${geminiResponse.status}: ${errorText}`);
        }

        const data = await geminiResponse.json() as any;

        let rawText = "";
        if (Array.isArray(data.steps)) {
            for (const step of data.steps) {
                if (step.type === "model_output" && Array.isArray(step.content)) {
                    for (const block of step.content) {
                        if (block.type === "text" && typeof block.text === "string") {
                            rawText += block.text;
                        }
                    }
                }
            }
        }

        if (!rawText) {
            log(`Unexpected response structure: ${JSON.stringify(data, null, 2)}`);
            throw new Error("Gemini returned empty response — no text found in steps");
        }

        const cleanJson = extractJson(rawText);
        let labelMapping: LabelMapping;
        try {
            labelMapping = JSON.parse(cleanJson);
        } catch (parseErr) {
            throw new Error(`Gemini returned invalid JSON: ${cleanJson}`);
        }

        validateLabelMapping(labelMapping);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log(`Sensor mapping completed in ${duration}s`);
        log(`Result: ${JSON.stringify(labelMapping, null, 2)}`);

        res.status(200).json({
            state: "success",
            message: "Sensor mapping completed successfully.",
            data: labelMapping
        });

    } catch (err) {
        log(`Error: ${err instanceof Error ? err.message : String(err)}`);
        next(err);
    }
};
