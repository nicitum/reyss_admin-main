import React, { useState, useEffect } from 'react';
import { getFontSizeOptions, applyFontSize, initializeFontSize } from '../utils/fontUtils';

const FontSettings = () => {
  const [selectedSize, setSelectedSize] = useState('medium');

  useEffect(() => {
    const currentSize = initializeFontSize();
    setSelectedSize(currentSize);
  }, []);

  const handleFontSizeChange = (size) => {
    setSelectedSize(size);
    applyFontSize(size);
    localStorage.setItem('panelFontSize', size);
  };

  const fontSizeOptions = getFontSizeOptions();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Font Settings</h1>
        <p className="text-gray-600 mb-8">Customize the font size for better readability</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fontSizeOptions.map((option) => (
            <div
              key={option.value}
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                selectedSize === option.value
                  ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
              }`}
              onClick={() => handleFontSizeChange(option.value)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{option.label}</h3>
                {selectedSize === option.value && (
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {option.size}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{option.description}</p>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className={`font-medium ${option.value === 'small' ? 'text-xs' : ''} ${option.value === 'medium' ? 'text-base' : ''} ${option.value === 'large' ? 'text-lg' : ''} ${option.value === 'extra-large' ? 'text-xl' : ''}`}>
                  The quick brown fox jumps over the lazy dog. This is a sample text to preview the selected font size.
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Note</h3>
          <p className="text-blue-700 text-sm">
            Changes to font size will be applied immediately across the entire application. 
            Your preference will be saved and applied automatically on future visits.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FontSettings;