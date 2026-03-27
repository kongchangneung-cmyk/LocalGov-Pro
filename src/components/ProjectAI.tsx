import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { Upload, Image as ImageIcon, Sparkles, Loader2, MessageSquare, Maximize } from 'lucide-react';
import { db, doc, onSnapshot } from '../firebase';

interface ProjectAIProps {
  projectId: string;
}

const ProjectAI: React.FC<ProjectAIProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate' | 'chat'>('analyze');
  
  // Analysis State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation State
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [useDeepThinking, setUseDeepThinking] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'projects', projectId), (doc) => {
      if (doc.exists()) {
        setProjectData(doc.data());
      }
    });
    return () => unsubscribe();
  }, [projectId]);

  const aiClient = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    setAnalysisResult('');
    
    try {
      // Extract base64 data
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1];

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: 'Analyze this image in the context of a construction/infrastructure project. What do you see? Are there any visible issues or progress indicators?',
            },
          ],
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });
      
      setAnalysisResult(response.text || 'No analysis result.');
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult('Error analyzing image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, aiClient]);

  const generateImage = useCallback(async () => {
    if (!generatePrompt) return;
    
    setIsGenerating(true);
    setGeneratedImage(null);
    
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: generatePrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: "1K"
          }
        },
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Error generating image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [generatePrompt, aspectRatio, aiClient]);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim()) return;
    
    const currentInput = chatInput;
    const newUserMessage = { role: 'user' as const, text: currentInput };
    setChatHistory(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsChatting(true);
    
    try {
      const response = await aiClient.models.generateContent({
        model: useDeepThinking ? 'gemini-3.1-pro-preview' : 'gemini-3.1-flash-lite-preview',
        contents: `Project Context: ${JSON.stringify(projectData)}. User Question: ${currentInput}`,
        config: {
          systemInstruction: 'You are a helpful project management assistant for this specific project. Use the provided project context to answer questions.',
          ...(useDeepThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {})
        }
      });
      
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, { role: 'model', text: 'Error getting response.' }]);
    } finally {
      setIsChatting(false);
    }
  }, [chatInput, projectData, useDeepThinking, aiClient]);

  return (
    <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-8">
      <div className="flex items-center gap-4 border-b border-neutral-100 pb-4">
        <button 
          onClick={() => setActiveTab('analyze')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'analyze' ? 'bg-orange-50 text-orange-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          <ImageIcon className="w-4 h-4" />
          วิเคราะห์รูปภาพ
        </button>
        <button 
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'generate' ? 'bg-orange-50 text-orange-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          <Sparkles className="w-4 h-4" />
          สร้างรูปภาพจำลอง
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'chat' ? 'bg-orange-50 text-orange-600' : 'text-neutral-500 hover:bg-neutral-50'}`}
        >
          <MessageSquare className="w-4 h-4" />
          ผู้ช่วย AI (ตอบกลับเร็ว)
        </button>
      </div>

      {activeTab === 'analyze' && (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50">
            {selectedImage ? (
              <div className="space-y-4 w-full flex flex-col items-center">
                <img src={selectedImage} alt="Selected" className="max-h-[300px] rounded-xl object-contain" />
                <div className="flex gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-neutral-200 rounded-xl font-bold text-sm hover:bg-neutral-50 transition-all"
                  >
                    เปลี่ยนรูปภาพ
                  </button>
                  <button 
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    วิเคราะห์ด้วย Gemini
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-neutral-100">
                  <Upload className="w-6 h-6 text-neutral-400" />
                </div>
                <div>
                  <p className="font-bold text-neutral-900">อัปโหลดรูปภาพหน้างาน</p>
                  <p className="text-sm text-neutral-500 mt-1">รองรับ JPG, PNG</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-neutral-800 transition-all"
                >
                  เลือกไฟล์
                </button>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {analysisResult && (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
              <h4 className="font-black text-blue-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                ผลการวิเคราะห์
              </h4>
              <div className="text-blue-800 whitespace-pre-wrap text-sm leading-relaxed">
                {analysisResult}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <label className="block text-sm font-bold text-neutral-700">คำอธิบายรูปภาพที่ต้องการสร้าง</label>
              <textarea 
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="เช่น ภาพจำลองถนนคอนกรีตหลังสร้างเสร็จ มีต้นไม้สองข้างทาง..."
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none h-32"
              />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold text-neutral-700">สัดส่วนภาพ (Aspect Ratio)</label>
              <div className="grid grid-cols-2 gap-2">
                {['1:1', '3:4', '4:3', '9:16', '16:9', '21:9'].map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${aspectRatio === ratio ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
              <button 
                onClick={generateImage}
                disabled={isGenerating || !generatePrompt}
                className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all disabled:opacity-50 mt-4"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                สร้างรูปภาพ
              </button>
            </div>
          </div>

          {generatedImage && (
            <div className="mt-8 border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50 p-4">
              <img src={generatedImage} alt="Generated" className="w-full h-auto rounded-xl shadow-sm" />
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="flex flex-col h-[500px] border border-neutral-200 rounded-2xl overflow-hidden">
          <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 text-sm">ผู้ช่วย AI โครงการ</h4>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{useDeepThinking ? 'วิเคราะห์เชิงลึก (Deep Thinking)' : 'ตอบกลับความเร็วสูง (Low-Latency)'}</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold text-neutral-600">Deep Thinking</span>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${useDeepThinking ? 'bg-orange-500' : 'bg-neutral-300'}`}>
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={useDeepThinking}
                  onChange={() => setUseDeepThinking(!useDeepThinking)}
                />
                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${useDeepThinking ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </label>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">พิมพ์ข้อความเพื่อสอบถามข้อมูลโครงการ</p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-neutral-900 text-white rounded-tr-sm' : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 p-4 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-neutral-200">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="พิมพ์ข้อความ..."
                className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              />
              <button 
                onClick={sendChatMessage}
                disabled={isChatting || !chatInput.trim()}
                className="px-6 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition-all disabled:opacity-50"
              >
                ส่ง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAI;
