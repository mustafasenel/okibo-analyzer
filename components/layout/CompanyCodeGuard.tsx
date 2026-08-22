'use client';

import { usePathname, useRouter } from 'next/navigation';
import { KeyRound, AlertTriangle, Ban, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCompanyCode } from '@/hooks/use-company-code';

/**
 * Firma kodu yoksa / geçersizse uygulamayı kilitleyen global uyarı.
 * Ayarlar sayfasında gösterilmez ki kullanıcı sorunu çözebilsin.
 */
export default function CompanyCodeGuard() {
    const t = useTranslations('CompanyGuard');
    const pathname = usePathname();
    const router = useRouter();
    const { status, needsAttention } = useCompanyCode();

    const cleanPath = pathname.replace(/^\/(tr|en|de)/, '') || '/';
    const onSettings = cleanPath.startsWith('/settings');
    const onAdmin = cleanPath.startsWith('/admin');

    const open = needsAttention && !onSettings && !onAdmin;

    if (status === 'loading') return null;

    const variant = {
        missing: {
            Icon: KeyRound,
            title: t('missingTitle'),
            description: t('missingDescription'),
            gradient: 'from-violet-500 to-fuchsia-600',
            glow: 'shadow-violet-500/30',
        },
        invalid: {
            Icon: AlertTriangle,
            title: t('invalidTitle'),
            description: t('invalidDescription'),
            gradient: 'from-amber-500 to-orange-600',
            glow: 'shadow-amber-500/30',
        },
        inactive: {
            Icon: Ban,
            title: t('inactiveTitle'),
            description: t('inactiveDescription'),
            gradient: 'from-rose-500 to-red-600',
            glow: 'shadow-rose-500/30',
        },
    }[status as 'missing' | 'invalid' | 'inactive'] ?? null;

    if (!variant) return null;

    const { Icon, title, description, gradient, glow } = variant;

    return (
        <AlertDialog open={open}>
            <AlertDialogContent
                className="max-w-[20rem] gap-0 rounded-2xl border-0 p-0 shadow-2xl sm:max-w-sm"
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
                    <div
                        className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg ${glow}`}
                    >
                        <Icon className="h-8 w-8 text-white" strokeWidth={2} />
                    </div>

                    <AlertDialogTitle className="text-lg font-bold text-gray-900">{title}</AlertDialogTitle>
                    <AlertDialogDescription className="mt-2 text-sm leading-relaxed text-gray-500">
                        {description}
                    </AlertDialogDescription>

                    <button
                        onClick={() => router.push('/settings')}
                        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${gradient} py-3 font-semibold text-white shadow-lg ${glow} transition active:scale-[0.98]`}
                    >
                        {t('goToSettings')}
                        <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="mt-4 text-xs text-gray-400">{t('hint')}</p>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
