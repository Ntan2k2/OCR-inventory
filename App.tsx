import React, { useState, useCallback, useMemo } from 'react';
import { analyzeInventorySheet } from './services/geminiService';
import { InventoryData } from './types';
import * as pdfjsLib from 'pdfjs-dist';
import { PageViewport, RenderParameters } from 'pdfjs-dist/types/src/display/api';

// Configure the PDF.js worker to enable PDF processing in the browser.
// The worker is loaded from a CDN to match the library in the import map.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^4.5.136/build/pdf.worker.mjs';


const DocumentScannerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.5a.5.5 0 0 1 .5.5v2.5a.5.5 0 0 1-1 0V3a.5.5 0 0 1 .5-.5Z" />
        <path d="M5.032 4.316a.5.5 0 0 1 .636-.211l2.364 1.013a.5.5 0 1 1-.422.923l-2.364-1.013a.5.5 0 0 1-.214-.712Z" />
        <path d="M16.58 5.118a.5.5 0 0 1-.422-.923l2.364-1.013a.5.5 0 0 1 .636.712l-2.364 1.013a.5.5 0 0 1-.214.21Z" />
        <path fillRule="evenodd" d="M12 21.5a.5.5 0 0 1-.5-.5V8a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M4 10a.5.5 0 0 1 .5-.5h15a.5.5 0 0 1 0 1H4.5a.5.5 0 0 1-.5-.5Z" clipRule="evenodd" />
        <path d="M7.5 13a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6ZM17.5 13a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6Z" />
    </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V8.25c0-1.121.904-2.025 2.025-2.025h13.95A2.025 2.025 0 0121 8.25v9a2.025 2.025 0 01-2.025 2.025H5.025A2.025 2.025 0 013 17.25z" />
    </svg>
);

const ApiIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5 0-4.5 16.5" />
    </svg>
);


const Loader: React.FC<{ status?: string | null }> = ({ status }) => (
    <div className="flex justify-center items-center p-8">
        <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="ml-4 text-lg">{status || 'Analyzing Document...'}</p>
    </div>
);

const ImageUploader: React.FC<{ onFileSelect: (file: File) => void; isProcessing: boolean }> = ({ onFileSelect, isProcessing }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div 
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-300 ${isDragging ? 'border-cyan-400 bg-gray-800' : 'border-gray-600 hover:border-cyan-500'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
        >
            <input 
                type="file" 
                id="file-upload" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept="image/*,application/pdf"
                onChange={handleChange}
                disabled={isProcessing}
            />
            <label htmlFor="file-upload" className={`flex flex-col items-center justify-center space-y-4 ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <UploadIcon className="w-12 h-12 text-gray-400" />
                <p className="text-gray-400">
                    <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Image (PNG, JPG) or PDF files</p>
            </label>
        </div>
    );
};

const ResultDisplay: React.FC<{ pagesData: InventoryData[] }> = ({ pagesData }) => {
    return (
        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
            {pagesData.map((data, index) => (
                 <div key={index}>
                    <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-500/30 pb-2 sticky top-0 bg-gray-800/50 backdrop-blur-sm z-10">
                        Page {index + 1} Results
                    </h2>
                     <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-gray-700 pb-2">Header Information</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                {Object.entries(data).filter(([key]) => key !== 'table').map(([key, value]) => (
                                    <div key={key} className="bg-gray-800 p-3 rounded-lg">
                                        <p className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                                        <p className="font-mono text-white">{value || 'N/A'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                             <h3 className="text-xl font-semibold text-cyan-300 mb-3 border-b border-gray-700 pb-2">Inventory Items</h3>
                             <div className="overflow-x-auto rounded-lg bg-gray-800">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-cyan-300 uppercase bg-gray-700/50">
                                        <tr>
                                            {data.table && data.table.length > 0 && Object.keys(data.table[0]).map(key => (
                                                <th key={key} scope="col" className="px-4 py-3">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.table && data.table.map((item, index) => (
                                            <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                {Object.values(item).map((value, i) => (
                                                    <td key={i} className="px-4 py-3 font-mono">{value === null ? <span className="text-gray-500">N/A</span> : String(value)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(!data.table || data.table.length === 0) && (
                                    <p className="text-center p-4 text-gray-500">No table data found on this page.</p>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ApiUsageDisplay: React.FC = () => {
    const codeSnippet = `
// n8n Code Node Snippet
// This code runs in a Node.js environment.
// It expects an input item with a binary property named 'data' representing the image file.
// You can get this from a previous node like 'HTTP Request' or 'Read Binary File'.

// 1. Add '@google/genai' to NODE_FUNCTION_ALLOW_EXTERNAL in your n8n env variables.
// 2. Create a 'Header Auth' credential in n8n named 'geminiApi' with key 'apiKey'.

const { GoogleGenAI, Type } = require('@google/genai');

const credentials = this.getCredentials('geminiApi');
const API_KEY = credentials.apiKey;

if (!API_KEY) {
  throw new Error("Gemini API key is not set in 'geminiApi' credentials.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const inputItem = this.getInputData()[0];
const binaryData = inputItem.binary.data;

if (!binaryData) {
    throw new Error("No binary data found. Ensure a previous node provides an image in the 'data' property.");
}

const imagePart = {
  inlineData: {
    data: binaryData.data.toString('base64'),
    mimeType: binaryData.mimeType,
  },
};

const prompt = \`You are an expert OCR system specialized in extracting structured data from Vietnamese warehouse inventory forms ('Phiếu kiểm kho'). Analyze the provided image, which contains both printed and handwritten text. Extract all header information and all rows from the table. Your output MUST be a single, valid JSON object that strictly adheres to the provided schema. Do not include any explanatory text, markdown formatting, or any characters outside of the JSON object. For empty or unreadable fields, use a null value.\`;

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

    // Return the structured data as the output of the n8n node
    return [{ json: data }];

} catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    if (error.message) {
      throw new Error(\`Failed to analyze image: \${error.message}\`);
    }
    throw new Error("An unknown error occurred during image analysis.");
}
`.trim();

    const [copyButtonText, setCopyButtonText] = useState('Copy Code');

    const handleCopy = () => {
        navigator.clipboard.writeText(codeSnippet).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy Code'), 2000);
        }).catch(() => {
            setCopyButtonText('Failed!');
            setTimeout(() => setCopyButtonText('Copy Code'), 2000);
        });
    };
    
    return (
        <div className="mt-8 bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-cyan-300 mb-4">Using OCR in n8n / Node.js</h2>
            <div className="space-y-4 text-gray-300">
                <p>Follow these steps to integrate this OCR functionality into your n8n workflow:</p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                    <li><span className="font-semibold">Enable External Modules:</span> In your n8n instance's environment variables, add <code className="bg-gray-900 px-1 py-0.5 rounded text-sm text-cyan-300">@google/genai</code> to your <code className="bg-gray-900 px-1 py-0.5 rounded text-sm text-cyan-300">NODE_FUNCTION_ALLOW_EXTERNAL</code> list.</li>
                    <li><span className="font-semibold">Add Credentials:</span> In n8n, go to Credentials and add a new 'Header Auth' credential. Name it <code className="bg-gray-900 px-1 py-0.5 rounded text-sm text-cyan-300">geminiApi</code>. For the credential values, use <code className="bg-gray-900 px-1 py-0.5 rounded text-sm text-cyan-300">apiKey</code> as the Name and your Gemini API key as the Value.</li>
                    <li><span className="font-semibold">Setup Workflow:</span> Your workflow must provide an image to the Code node. For example, use the 'HTTP Request' node to download an image, making sure to set 'Response Format' to 'File'. The Code node will receive this as binary data.</li>
                    <li><span className="font-semibold">Use the Code Node:</span> Create a 'Code' node in your workflow and paste the code below.</li>
                </ol>
            </div>
            <div className="relative bg-gray-900 rounded-lg mt-6">
                <button 
                    onClick={handleCopy}
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-cyan-600 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors"
                >
                    {copyButtonText}
                </button>
                <pre className="p-4 text-sm text-gray-200 overflow-x-auto rounded-lg"><code className="language-javascript">{codeSnippet}</code></pre>
            </div>
        </div>
    );
};


export default function App() {
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [extractedPagesData, setExtractedPagesData] = useState<InventoryData[]>([]);
    const [showApiUsage, setShowApiUsage] = useState<boolean>(false);
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);

    const filePreviewUrl = useMemo(() => {
        if (sourceFile && sourceFile.type.startsWith("image/")) {
            return URL.createObjectURL(sourceFile);
        }
        return null;
    }, [sourceFile]);

    const handleFileSelect = (file: File) => {
        setError(null);
        setExtractedPagesData([]);
        setSourceFile(file);
    };

    const handleAnalyze = useCallback(async () => {
        if (!sourceFile) {
            setError("Please select a file first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setExtractedPagesData([]);
        setProcessingStatus('Starting analysis...');

        try {
            if (sourceFile.type.startsWith("image/")) {
                setProcessingStatus('Analyzing image...');
                const data = await analyzeInventorySheet(sourceFile);
                setExtractedPagesData([data]);
            } else if (sourceFile.type === "application/pdf") {
                const fileBuffer = await sourceFile.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
                const numPages = pdf.numPages;
                const allPagesData: InventoryData[] = [];

                for (let i = 1; i <= numPages; i++) {
                    setProcessingStatus(`Analyzing page ${i} of ${numPages}...`);
                    
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
                    
                    const canvas = document.createElement('canvas');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const context = canvas.getContext('2d')!;

                    // Fix: The installed pdfjs-dist types seem to require a 'canvas' property on RenderParameters.
                    // We provide it to satisfy the compiler, though modern versions of pdf.js would only
                    // need 'canvasContext'.
                    await page.render({ canvasContext: context, viewport: viewport, canvas: canvas } as RenderParameters).promise;
                    
                    const pageImageFile = await new Promise<File>((resolve, reject) => {
                        canvas.toBlob(blob => {
                            if (blob) {
                                resolve(new File([blob], `page_${i}.jpeg`, { type: 'image/jpeg' }));
                            } else {
                                reject(new Error('Canvas to Blob conversion failed'));
                            }
                        }, 'image/jpeg', 0.95);
                    });

                    const pageData = await analyzeInventorySheet(pageImageFile);
                    allPagesData.push(pageData);
                }
                setExtractedPagesData(allPagesData);
            } else {
                throw new Error("Unsupported file type. Please upload an image or a PDF.");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            setProcessingStatus(null);
        }
    }, [sourceFile]);
    
    const handleReset = () => {
        setSourceFile(null);
        setExtractedPagesData([]);
        setError(null);
        setIsLoading(false);
        setProcessingStatus(null);
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <div className="flex items-center justify-center gap-4">
                         <DocumentScannerIcon className="w-12 h-12 text-cyan-400" />
                        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                            Inventory Sheet OCR
                        </h1>
                    </div>
                    <p className="mt-2 text-lg text-gray-400">
                        Powered by Gemini - Upload a document to extract structured data.
                    </p>
                    <button
                        onClick={() => setShowApiUsage(!showApiUsage)}
                        className="mt-4 inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        <ApiIcon className="w-5 h-5" />
                        {showApiUsage ? 'Hide API for n8n' : 'Show API for n8n'}
                    </button>
                </header>

                <main className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <ImageUploader onFileSelect={handleFileSelect} isProcessing={isLoading} />
                        {sourceFile && (
                             <div className="bg-gray-800 rounded-xl p-4">
                                <h3 className="font-semibold mb-2">File Preview</h3>
                                {filePreviewUrl ? (
                                    <img src={filePreviewUrl} alt="File preview" className="rounded-lg max-h-96 w-auto mx-auto" />
                                ) : (
                                    <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                                        <p className="font-semibold">{sourceFile.name}</p>
                                        <p className="text-sm text-gray-400">PDF preview is not available. Press 'Analyze' to process.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex space-x-4">
                            <button
                                onClick={handleAnalyze}
                                disabled={!sourceFile || isLoading}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center"
                            >
                                {isLoading ? 'Analyzing...' : 'Analyze Document'}
                            </button>
                             <button
                                onClick={handleReset}
                                disabled={isLoading}
                                className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-6 min-h-[300px] flex flex-col justify-center">
                        {isLoading && <Loader status={processingStatus} />}
                        {error && (
                             <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                                 <p className="font-bold">Error</p>
                                 <p>{error}</p>
                            </div>
                        )}
                        {extractedPagesData.length > 0 && <ResultDisplay pagesData={extractedPagesData} />}
                        {!isLoading && !error && extractedPagesData.length === 0 && (
                            <div className="text-center text-gray-500">
                                <p>Extracted data will appear here.</p>
                            </div>
                        )}
                    </div>
                </main>

                {showApiUsage && <ApiUsageDisplay />}
            </div>
        </div>
    );
}
