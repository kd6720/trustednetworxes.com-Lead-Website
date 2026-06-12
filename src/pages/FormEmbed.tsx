import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Loader2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { PublicForm, FormField } from '../types';

export default function FormEmbed() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get<PublicForm>(`/public/forms/${formId}`)
      .then((f) => {
        setForm(f);
        setValues(
          Object.fromEntries(f.fields.map((field) => [field.name, '']))
        );
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Form not found');
        } else {
          setError('Failed to load form');
        }
      })
      .finally(() => setLoading(false));
  }, [formId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSending(true);
    try {
      // The backend derives a lead from the raw field values, so post them
      // directly (not wrapped in a `data` envelope).
      await api.post(`/public/forms/${formId}/submit`, values);
      setSubmitted(true);
    } catch {
      // Submission failed — could show inline error, but keeping it simple per the embed pattern
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  if (!form) return null;

  if (submitted) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Helmet>
          <title>{form.name} · TrustedNetworx</title>
        </Helmet>
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {form.confirmationMessage || 'Thank you!'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">We'll be in touch shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6">
      <Helmet>
        <title>{form.name} · TrustedNetworx</title>
      </Helmet>
      <div className="rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">{form.name}</h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {form.fields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={values[field.name] ?? ''}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.name]: v }))}
            />
          ))}

          <button
            type="submit"
            disabled={sending}
            className="btn btn-primary w-full"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by TrustedNetworx CRM
        </p>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `field-${field.name}`;
  const common =
    'input w-full';

  if (field.type === 'textarea') {
    return (
      <div>
        <label htmlFor={id} className="label">
          {field.label}
          {field.required && <span className="text-rose-500"> *</span>}
        </label>
        <textarea
          id={id}
          className={`${common} min-h-24`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.label}
        />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="label">
        {field.label}
        {field.required && <span className="text-rose-500"> *</span>}
      </label>
      <input
        id={id}
        type={field.type}
        className={common}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        placeholder={field.label}
      />
    </div>
  );
}
