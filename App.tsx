import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { analyzeInventorySheet } from './services/geminiService';
import { InventoryData } from './types';
import * as pdfjsLib from 'pdfjs-dist';
import { PageViewport } from 'pdfjs-dist';

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

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
);

const InboxArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
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
                    <h2 className="text-2xl font-bold text-cyan-300 mb-4 border-b-2 border-cyan-500/30 pb-2 sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">
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

const NocoDbSettings: React.FC<{
    url: string;
    setUrl: (url: string) => void;
    disabled: boolean;
}> = ({ url, setUrl, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-gray-800/50 rounded-xl">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-semibold"
            >
                <div className="flex items-center gap-3">
                    <SettingsIcon className="w-6 h-6 text-cyan-400" />
                    <span>NocoDB Integration Settings</span>
                </div>
                <svg
                    className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-700 space-y-4">
                    <div>
                        <label htmlFor="nocodb-url" className="block text-sm font-medium text-gray-300 mb-1">
                            NocoDB Base URL
                        </label>
                        <input
                            id="nocodb-url"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://your.nocodb.instance"
                            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};


export default function App() {
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [extractedPagesData, setExtractedPagesData] = useState<InventoryData[]>([]);
    const [processingStatus, setProcessingStatus] = useState<string | null>(null);

    const [nocoDbUrl, setNocoDbUrl] = useState<string>(() => localStorage.getItem('nocoDbUrl') || 'https://purchase.hungvu.vn');
    const [nocoDbToken, setNocoDbToken] = useState<string>('TbKBT9l7dZZjEvBdWI_21RCyAyvCDD6Ak2mtbdhR');
    const [isSendingToNocoDb, setIsSendingToNocoDb] = useState<boolean>(false);
    const [nocoDbStatus, setNocoDbStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    useEffect(() => {
        localStorage.setItem('nocoDbUrl', nocoDbUrl);
    }, [nocoDbUrl]);

    const filePreviewUrl = useMemo(() => {
        if (sourceFile && sourceFile.type.startsWith("image/")) {
            return URL.createObjectURL(sourceFile);
        }
        return null;
    }, [sourceFile]);

    const handleFileSelect = (file: File) => {
        setError(null);
        setNocoDbStatus(null);
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
        setNocoDbStatus(null);
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
                    const viewport = page.getViewport({ scale: 2.0 });
                    
                    const canvas = document.createElement('canvas');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const context = canvas.getContext('2d')!;

                    // FIX: The type definitions for pdfjs-dist seem to require the 'canvas' property on RenderParameters. Adding it to satisfy the type checker.
                    await page.render({ canvasContext: context, viewport: viewport, canvas: canvas as any }).promise;
                    
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
    
    const handleSendToNocoDb = async () => {
        if (!nocoDbUrl || !nocoDbToken) {
            setNocoDbStatus({ type: 'error', message: 'NocoDB URL is missing or token is invalid.' });
            return;
        }
        if (extractedPagesData.length === 0) {
            setNocoDbStatus({ type: 'info', message: 'No data to send.' });
            return;
        }

        setIsSendingToNocoDb(true);
        setNocoDbStatus({ type: 'info', message: 'Preparing and sending data to NocoDB...' });

        const recordsToSend: Record<string, any>[] = [];
        for (const pageData of extractedPagesData) {
            const shelfLocation = `${pageData.Kho || 'N/A'}.${pageData.Tầng || 'N/A'}.${pageData['Vị trí/kệ'] || 'N/A'}`;

            if (pageData.table && pageData.table.length > 0) {
                for (const item of pageData.table) {
                    recordsToSend.push({
                        "Vị trí kệ": shelfLocation,
                        "Tầng-Ngăn (Vị trí)": item['Tầng-Ngăn (Vị trí)'],
                        "Mã SP": item['Mã SP'],
                        "Hãng": item['Hãng'],
                        "Loại": item['Loại'],
                        "Số lượng": item['Số lượng'],
                        "Ghi chú": item['Ghi chú'],
                    });
                }
            }
        }
        
        if (recordsToSend.length === 0) {
            setNocoDbStatus({ type: 'info', message: 'No inventory items found in the document to send.' });
            setIsSendingToNocoDb(false);
            return;
        }

        try {
            // The table name is provided in the prompt: mvy7zfz17dzksr3
            const response = await fetch(`${nocoDbUrl}/api/v2/tables/mvy7zfz17dzksr3/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xc-token': nocoDbToken,
                },
                body: JSON.stringify(recordsToSend),
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                } catch {
                     throw new Error(errorText || `HTTP error! status: ${response.status}`);
                }
            }

            await response.json();
            setNocoDbStatus({ type: 'success', message: `Successfully sent ${recordsToSend.length} records to NocoDB!` });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            setNocoDbStatus({ type: 'error', message: `Failed to send data: ${errorMessage}` });
        } finally {
            setIsSendingToNocoDb(false);
        }
    };
    
    const handleReset = () => {
        setSourceFile(null);
        setExtractedPagesData([]);
        setError(null);
        setNocoDbStatus(null);
        setIsLoading(false);
        setProcessingStatus(null);
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
        }
    };

    const statusColors = {
        success: 'text-green-400 bg-green-900/50',
        error: 'text-red-400 bg-red-900/50',
        info: 'text-cyan-400 bg-cyan-900/50',
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
                </header>

                <main className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <NocoDbSettings url={nocoDbUrl} setUrl={setNocoDbUrl} disabled={isLoading || isSendingToNocoDb} />
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

                        <div className="flex flex-col space-y-4">
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
                            {extractedPagesData.length > 0 && (
                                <button
                                    onClick={handleSendToNocoDb}
                                    disabled={isLoading || isSendingToNocoDb}
                                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
                                >
                                    <InboxArrowDownIcon className="w-5 h-5" />
                                    {isSendingToNocoDb ? 'Sending...' : 'Send to NocoDB'}
                                </button>
                            )}
                        </div>
                         {nocoDbStatus && (
                            <div className={`text-center p-3 rounded-lg text-sm ${statusColors[nocoDbStatus.type]}`}>
                                {nocoDbStatus.message}
                            </div>
                        )}
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

            </div>
        </div>
    );
}
