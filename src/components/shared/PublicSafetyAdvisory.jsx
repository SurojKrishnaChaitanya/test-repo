import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Languages,
  AlertOctagon,
  LifeBuoy,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { generateAdvisory, SUPPORTED_LANGUAGES } from '../../services/ragAdvisoryService';

export default function PublicSafetyAdvisory({ advisory, regionName, hazardType, severity, riskScore }) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [activeAdvisory, setActiveAdvisory] = useState(advisory);
  const [isLoadingLang, setIsLoadingLang] = useState(false);

  useEffect(() => {
    setActiveAdvisory(advisory);
  }, [advisory]);

  const handleLanguageChange = async (langCode) => {
    setSelectedLang(langCode);

    // If translations already exist in payload, no extra fetch needed
    if (activeAdvisory?.multilingual_translations?.[langCode]) {
      return;
    }

    setIsLoadingLang(true);
    try {
      const data = await generateAdvisory({
        regionName: regionName || activeAdvisory?.regionName || 'Selected Region',
        hazardType: hazardType || activeAdvisory?.hazardType || 'flashFlood',
        severity: severity || activeAdvisory?.severity || 'severe',
        riskScore: riskScore || activeAdvisory?.riskScore || 85,
        targetLanguages: [langCode],
      });
      setActiveAdvisory((prev) => ({
        ...prev,
        ...data,
        multilingual_translations: {
          ...(prev?.multilingual_translations || {}),
          ...(data?.multilingual_translations || {}),
        },
      }));
    } catch (err) {
      // Clean fallback handled in service
    } finally {
      setIsLoadingLang(false);
    }
  };

  const currentTranslation = activeAdvisory?.multilingual_translations?.[selectedLang] || {
    headline: activeAdvisory?.advisoryText || 'Active Convective Weather Warning',
    immediate_action: 'Follow local district emergency authority guidelines and avoid flood-prone terrain.',
    evacuation_instructions: 'Keep emergency supplies accessible and monitor VHF and CAP-SMS broadcasts.',
  };

  const citedSources = activeAdvisory?.citedSources || [];

  return (
    <div className="p-6 bg-white rounded-2xl border border-emerald-200 shadow-sm space-y-5 select-none text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
              Multilingual RAG Disaster Advisory
            </h2>
            <p className="text-xs text-slate-500">
              Retrieval-Augmented Generation Grounded in Official NDMA Safety SOPs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>NDMA CAP v1.2 Standard</span>
          </span>
        </div>
      </div>

      {/* 8 Indian Languages Selector Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
            <Languages className="w-3.5 h-3.5 text-emerald-600" />
            Select Broadcast Language (8 Indian Languages):
          </span>
          {isLoadingLang && (
            <span className="text-[10px] text-emerald-600 font-mono animate-pulse">
              Synthesizing RAG Directives...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{lang.label}</span>
                <span className={`text-[10px] font-normal ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  ({lang.native})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Localized Advisory Text Card */}
      <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-3">
        {/* Headline */}
        <div className="flex items-start gap-2.5">
          <AlertOctagon className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-emerald-950">
              {currentTranslation.headline}
            </h3>
            <p className="text-xs leading-relaxed text-emerald-900">
              {currentTranslation.immediate_action}
            </p>
          </div>
        </div>

        {/* Evacuation / Preparedness Directives */}
        {currentTranslation.evacuation_instructions && (
          <div className="flex items-start gap-2.5 pt-2 border-t border-emerald-200/60">
            <LifeBuoy className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              <strong>Evacuation Protocol:</strong> {currentTranslation.evacuation_instructions}
            </p>
          </div>
        )}
      </div>

      {/* Cited Official Guidelines & Sources */}
      {citedSources.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Regulatory Citations & Statutory Grounding</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">RAG Chunk Verification</span>
          </div>

          <div className="space-y-2">
            {citedSources.map((src, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {src.source}
                  </span>
                  {src.section && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono text-[9px] font-semibold text-slate-700">
                      {src.section}
                    </span>
                  )}
                </div>
                {src.snippet && (
                  <p className="text-[11px] text-slate-600 italic pl-3 border-l-2 border-emerald-300">
                    "{src.snippet}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}