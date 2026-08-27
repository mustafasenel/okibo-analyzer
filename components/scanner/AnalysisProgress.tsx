'use client';

import { Loader2, Check, ScanText, Layers, CloudUpload } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type AnalysisStage = 'analyzing' | 'aggregating' | 'uploading';

interface AnalysisProgressProps {
    stage: AnalysisStage;
    analyzed: number;   // analizi biten sayfa sayısı
    uploaded: number;   // yüklemesi biten sayfa sayısı
    total: number;      // toplam sayfa
    elapsedSeconds: number;
}

const STEP_ORDER: AnalysisStage[] = ['analyzing', 'aggregating', 'uploading'];

export default function AnalysisProgress({
    stage,
    analyzed,
    uploaded,
    total,
    elapsedSeconds,
}: AnalysisProgressProps) {
    const t = useTranslations('AnalysisProgress');

    // İlerleme: analiz ve yükleme eşit ağırlıkta (toplam 2 × sayfa iş birimi)
    const done = analyzed + uploaded;
    const percent = total > 0 ? Math.min(100, Math.round((done / (total * 2)) * 100)) : 0;

    const currentIndex = STEP_ORDER.indexOf(stage);

    const steps = [
        { key: 'analyzing' as const, Icon: ScanText, label: t('stepAnalyzing'), counter: `${analyzed}/${total}` },
        { key: 'aggregating' as const, Icon: Layers, label: t('stepAggregating'), counter: null },
        { key: 'uploading' as const, Icon: CloudUpload, label: t('stepUploading'), counter: `${uploaded}/${total}` },
    ];

    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const elapsedText = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;

    return (
        <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-2xl shadow-violet-500/20">
            {/* Başlık + yüzde */}
            <div className="mb-3 flex items-end justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">{t('title')}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{t('subtitle', { total })}</p>
                </div>
                <span className="text-2xl font-bold tabular-nums text-violet-600">%{percent}</span>
            </div>

            {/* İlerleme çubuğu */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(percent, 4)}%` }}
                />
            </div>

            {/* Aşamalar */}
            <ul className="mt-4 space-y-2.5">
                {steps.map((step, index) => {
                    const isDone = index < currentIndex;
                    const isActive = index === currentIndex;
                    const StepIcon = step.Icon;

                    return (
                        <li key={step.key} className="flex items-center gap-3">
                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                                    isDone
                                        ? 'bg-green-100 text-green-600'
                                        : isActive
                                        ? 'bg-violet-100 text-violet-600'
                                        : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {isDone ? (
                                    <Check className="h-4 w-4" />
                                ) : isActive ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <StepIcon className="h-4 w-4" />
                                )}
                            </span>

                            <span
                                className={`flex-1 text-sm ${
                                    isDone
                                        ? 'text-gray-500'
                                        : isActive
                                        ? 'font-medium text-gray-900'
                                        : 'text-gray-400'
                                }`}
                            >
                                {step.label}
                            </span>

                            {step.counter && (isActive || isDone) && (
                                <span className="text-xs font-semibold tabular-nums text-gray-500">
                                    {step.counter}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Alt bilgi: geçen süre + uyarı */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-xs text-gray-400">{t('elapsed', { time: elapsedText })}</span>
                <span className="text-xs text-gray-400">{t('keepOpen')}</span>
            </div>
        </div>
    );
}
