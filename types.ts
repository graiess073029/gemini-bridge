import { Response, Request } from "express";

/**
 * @fileoverview Type definitions
 * Contains interfaces and types used throughout the application
 */

export interface CustomResponse extends Response {
  body?: HttpResponse
}

export interface CustomRequest extends Request {
  startTime?: Date;
  id? : string;
}

export interface appConfig {
  server : {
    serverPort: number,
    secretKey?: string,
    host : string
  },

  apiKey : string
}

export interface HttpResponse {
  state : 'success' | 'error';
  message: string;
  data?: object | any[]
}


export interface SensorCandidate {
  index: number;
  label: string;
  unit: string;
  type: string;
  group: string;
  sensorId: number;
}

export interface SensorMapping {
  sensorId: number;
  labelOriginal: string;
}

export interface LabelMapping {
  cpu: {
    usage: SensorMapping | null;
    clock: SensorMapping | null;
    temperature: SensorMapping | null;
    voltage: SensorMapping | null;
    power: SensorMapping | null;
    cores: {
      name: string;
      type: "performance" | "efficiency" | "standard";
      usageSensors: SensorMapping[];
      clockSensor: SensorMapping | null;
      temperatureSensor: SensorMapping | null;
    }[];
  };
  gpu: {
    usage: SensorMapping | null;
    clock: SensorMapping | null;
    temperature: SensorMapping | null;
    power: SensorMapping | null;
    vramAllocated: SensorMapping | null;
    vramAvailable: SensorMapping | null;
  };
  iGpu: {
    usage: SensorMapping | null;
    clock: SensorMapping | null;
    temperature: SensorMapping | null;
    power: SensorMapping | null;
    vramAllocated: SensorMapping | null;
  };
  memory: {
    usage: SensorMapping | null;
    available: SensorMapping | null;
  };
  fans: {
    name: string;
    sensorId: number;
    labelOriginal: string;
  }[];
  battery: {
    level: SensorMapping | null;
    chargeRate: SensorMapping | null;
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
