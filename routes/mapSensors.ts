import { config } from "../config/config.js";
import type { NextFunction } from "express";
import { CustomRequest, CustomResponse, GeminiResponse, HttpResponse, LabelMapping } from "../types.js";
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

const GEMINI_TIMEOUT_MS = 60_000;

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
                        model: "gemini-3.5-flash",
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

        const data = (await geminiResponse.json()) as GeminiResponse;

        const rawText = (data as any).output_text
            ?? data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
            throw new Error("Gemini returned empty response — no text found");
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
