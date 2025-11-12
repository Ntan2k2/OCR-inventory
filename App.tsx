
import React, { useState, useCallback, useMemo } from 'react';
import { analyzeInventorySheet } from './services/geminiService';
import { InventoryData } from './types';

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

const Loader: React.FC = () => (
    <div className="flex justify-center items-center p-8">
        <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="ml-4 text-lg">Analyzing Document...</p>
    </div>
);

const ImageUploader: React.FC<{ onImageSelect: (file: File) => void; isProcessing: boolean }> = ({ onImageSelect, isProcessing }) => {
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
            onImageSelect(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImageSelect(e.target.files[0]);
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
                accept="image/*"
                onChange={handleChange}
                disabled={isProcessing}
            />
            <label htmlFor="file-upload" className={`flex flex-col items-center justify-center space-y-4 ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <UploadIcon className="w-12 h-12 text-gray-400" />
                <p className="text-gray-400">
                    <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
            </label>
        </div>
    );
};

const ResultDisplay: React.FC<{ data: InventoryData }> = ({ data }) => {
    return (
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
                                {Object.keys(data.table[0] || {}).map(key => (
                                    <th key={key} scope="col" className="px-4 py-3">{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.table.map((item, index) => (
                                <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    {Object.values(item).map((value, i) => (
                                        <td key={i} className="px-4 py-3 font-mono">{value === null ? <span className="text-gray-500">N/A</span> : String(value)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};


export default function App() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<InventoryData | null>(null);

    const imagePreviewUrl = useMemo(() => {
        if (imageFile) {
            return URL.createObjectURL(imageFile);
        }
        return null;
    }, [imageFile]);

    const handleImageSelect = (file: File) => {
        setError(null);
        setExtractedData(null);
        setImageFile(file);
    };

    const handleAnalyze = useCallback(async () => {
        if (!imageFile) {
            setError("Please select an image first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setExtractedData(null);

        try {
            const data = await analyzeInventorySheet(imageFile);
            setExtractedData(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [imageFile]);
    
    const handleReset = () => {
        setImageFile(null);
        setExtractedData(null);
        setError(null);
        setIsLoading(false);
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
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
                </header>

                <main className="grid lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <ImageUploader onImageSelect={handleImageSelect} isProcessing={isLoading} />
                        {imagePreviewUrl && (
                            <div className="bg-gray-800 rounded-xl p-4">
                                <h3 className="font-semibold mb-2">Image Preview</h3>
                                <img src={imagePreviewUrl} alt="Inventory sheet preview" className="rounded-lg max-h-96 w-auto mx-auto" />
                            </div>
                        )}
                        <div className="flex space-x-4">
                            <button
                                onClick={handleAnalyze}
                                disabled={!imageFile || isLoading}
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
                        {isLoading && <Loader />}
                        {error && (
                             <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
                                 <p className="font-bold">Error</p>
                                 <p>{error}</p>
                            </div>
                        )}
                        {extractedData && <ResultDisplay data={extractedData} />}
                        {!isLoading && !error && !extractedData && (
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
