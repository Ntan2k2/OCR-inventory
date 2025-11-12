
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryData } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const inventorySchema = {
    type: Type.OBJECT,
    properties: {
        'Kho': { type: Type.STRING, description: "Warehouse code", nullable: true },
        'Tầng': { type: Type.STRING, description: "Floor number", nullable: true },
        'Vị trí/kệ': { type: Type.STRING, description: "Shelf location", nullable: true },
        'Ngày kiểm kho': { type: Type.STRING, description: "Date of inventory check (DD/MM/YYYY)", nullable: true },
        'Người kiểm': { type: Type.STRING, description: "Name of the inspector", nullable: true },
        'Người duyệt': { type: Type.STRING, description: "Name of the approver", nullable: true },
        'table': {
            type: Type.ARRAY,
            description: "List of inventory items.",
            items: {
                type: Type.OBJECT,
                properties: {
                    'STT': { type: Type.NUMBER, description: "Sequence number", nullable: true },
                    'Tầng-Ngăn (Vị trí)': { type: Type.STRING, description: "Sub-location/shelf", nullable: true },
                    'Mã SP': { type: Type.STRING, description: "Product Code", nullable: true },
                    'Hãng': { type: Type.STRING, description: "Brand", nullable: true },
                    'Loại': { type: Type.STRING, description: "Type", nullable: true },
                    'Số lượng': { type: Type.NUMBER, description: "Quantity", nullable: true },
                    'Ghi chú': { type: Type.STRING, description: "Notes", nullable: true },
                },
                 required: ['STT', 'Mã SP', 'Số lượng']
            }
        }
    },
    required: ['Kho', 'Tầng', 'Vị trí/kệ', 'Ngày kiểm kho', 'Người kiểm', 'table']
};


export const analyzeInventorySheet = async (imageFile: File): Promise<InventoryData> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = await fileToGenerativePart(imageFile);

    const prompt = `You are an expert OCR system specialized in extracting structured data from Vietnamese warehouse inventory forms ('Phiếu kiểm kho'). Analyze the provided image, which contains both printed and handwritten text. Extract all header information and all rows from the table. Your output MUST be a single, valid JSON object that strictly adheres to the provided schema. Do not include any explanatory text, markdown formatting, or any characters outside of the JSON object. For empty or unreadable fields, use a null value.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: inventorySchema,
            }
        });

        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        return data as InventoryData;
    } catch (error) {
        console.error("Error analyzing image with Gemini:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to analyze image: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image analysis.");
    }
};
