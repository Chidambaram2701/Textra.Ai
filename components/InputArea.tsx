import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ImagePlus, X } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string, image?: File) => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    
    onSend(input, selectedImage || undefined);
    
    setInput('');
    removeImage();
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full p-4 pb-6 bg-gradient-to-t from-white via-white dark:from-gray-700 dark:via-gray-700 to-transparent pt-20 z-10 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg group">
              <img src={imagePreview} alt="Preview" className="h-20 w-auto object-cover opacity-90" />
              <button 
                onClick={removeImage}
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <div className="relative flex items-end w-full p-3 bg-white dark:bg-[#40414F] rounded-xl shadow-lg border border-black/10 focus-within:border-black/20 dark:focus-within:border-black/30 focus-within:shadow-xl transition-all overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-black/20"
            disabled={isLoading}
            title="Attach image"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*"
            onChange={handleImageSelect}
          />

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedImage ? "Describe how to edit this image..." : "Send a message..."}
            className="w-full max-h-[200px] bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 resize-none py-3 pr-12 pl-1 leading-relaxed custom-scrollbar"
            style={{ minHeight: '44px', maxHeight: '200px' }}
            disabled={isLoading}
          />
          
          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className={`absolute right-3 bottom-3 p-2 rounded-md transition-all duration-200 ${
              (input.trim() || selectedImage) && !isLoading
                ? 'bg-primary-500 text-white shadow-sm hover:bg-primary-600'
                : 'bg-transparent text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <div className="text-center mt-3 text-[11px] text-gray-500 dark:text-gray-400/80 hidden md:block select-none">
          <span className="underline decoration-gray-400 dark:decoration-gray-500 cursor-pointer hover:text-gray-800 dark:hover:text-gray-300">Textra AI</span> can make mistakes. Consider checking important information.
        </div>
      </div>
    </div>
  );
};

export default InputArea;