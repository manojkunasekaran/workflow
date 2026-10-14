import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FormSchemaBuilder } from '@/features/forms/builder/FormSchemaBuilder';
import { defaultLandingFormSchema } from '@/types/form';
import type { FormTriggerConfig } from '@/types/form';

export function createDefaultFormTriggerConfig(): FormTriggerConfig {
    return {
        active: true,
        slug: '',
        landingPage: defaultLandingFormSchema(),
        authMode: 'PUBLIC',
    };
}

interface FormTriggerTabProps {
    config: FormTriggerConfig;
    onChange: (next: FormTriggerConfig) => void;
}

export function FormTriggerTab({ config, onChange }: FormTriggerTabProps) {
    const [copied, setCopied] = useState<string | null>(null);
    const slug = config.slug ?? '';
    const publicUrl = slug ? `${window.location.origin}/f/${slug}` : '';
    const testUrl = slug ? `${window.location.origin}/f/${slug}?test=1` : '';
    const embedCode = slug
        ? `<iframe src="${publicUrl}" title="Form" width="100%" height="640" style="border:0;" loading="lazy"></iframe>`
        : '';

    const copy = async (label: string, text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <Label>Form URL slug</Label>
                <Input
                    value={slug}
                    placeholder="contact-us"
                    onChange={(e) => onChange({ ...config, slug: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') })}
                />
                <p className="text-xs text-muted-foreground break-all">
                    Public: {publicUrl || '—'} · Test: {testUrl || '—'}
                </p>
                {publicUrl ? (
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => void copy('public', publicUrl)}>
                            {copied === 'public' ? 'Copied' : 'Copy public URL'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void copy('test', testUrl)}>
                            {copied === 'test' ? 'Copied' : 'Copy test URL'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => void copy('embed', embedCode)}>
                            {copied === 'embed' ? 'Copied' : 'Copy embed HTML'}
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="space-y-2">
                <Label>Landing page</Label>
                <FormSchemaBuilder
                    value={config.landingPage ?? defaultLandingFormSchema()}
                    onChange={(landingPage) => onChange({ ...config, landingPage })}
                />
            </div>

            <div className="space-y-1.5">
                <Label>Completion message (optional)</Label>
                <Input
                    value={config.completionMessage ?? ''}
                    onChange={(e) => onChange({ ...config, completionMessage: e.target.value })}
                />
            </div>
            <div className="space-y-1.5">
                <Label>Redirect URL after submit (optional)</Label>
                <Input
                    value={config.redirectUrl ?? ''}
                    onChange={(e) => onChange({ ...config, redirectUrl: e.target.value })}
                />
            </div>
        </div>
    );
}
