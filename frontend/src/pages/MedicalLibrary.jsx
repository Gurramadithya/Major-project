import { useMemo, useState } from 'react';
import PageContainer from '../components/PageContainer';

const libraryItems = [
  {
    title: 'Pneumonia',
    summary: 'An infection that causes inflammation in the air sacs of the lungs.',
    symptoms: ['Fever', 'Cough', 'Shortness of breath', 'Chest pain'],
    treatment: ['Antibiotics', 'Oxygen support', 'Hydration'],
    references: ['Clinical guidelines', 'Pulmonology review'],
  },
  {
    title: 'Tuberculosis',
    summary: 'A bacterial infection that most commonly affects the lungs.',
    symptoms: ['Persistent cough', 'Weight loss', 'Night sweats', 'Fatigue'],
    treatment: ['Multi-drug antibiotics', 'Airborne isolation', 'Follow-up imaging'],
    references: ['WHO recommendations', 'Respiratory infection protocols'],
  },
  {
    title: 'COVID-19',
    summary: 'A respiratory infection caused by SARS-CoV-2.',
    symptoms: ['Fever', 'Loss of smell', 'Fatigue', 'Dry cough'],
    treatment: ['Supportive care', 'Monitoring', 'Oxygen if required'],
    references: ['Public health guidance', 'Infectious disease references'],
  },
  {
    title: 'Lung Cancer',
    summary: 'A malignant tumor arising from the cells of the lungs.',
    symptoms: ['Persistent cough', 'Weight loss', 'Hemoptysis', 'Chest pain'],
    treatment: ['Surgical evaluation', 'Radiation', 'Oncology referral'],
    references: ['Oncology guidelines', 'Thoracic surgery references'],
  },
];

const MedicalLibrary = () => {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalized = query.toLowerCase();
    return libraryItems.filter((item) => item.title.toLowerCase().includes(normalized) || item.summary.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <PageContainer title="Medical Library" subtitle="Search a curated set of common medical conditions with symptoms, treatment guidance, and references.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lung conditions"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <div className="mt-4 space-y-3">
            {filteredItems.map((item) => (
              <button key={item.title} type="button" className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left text-sm text-slate-300 hover:bg-slate-800">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-slate-400">{item.summary}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          {filteredItems[0] ? (
            <>
              <h3 className="text-xl font-semibold text-white">{filteredItems[0].title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{filteredItems[0].summary}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-cyan-400">Symptoms</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{filteredItems[0].symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}</ul>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-emerald-400">Treatment</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{filteredItems[0].treatment.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold text-amber-400">References</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{filteredItems[0].references.map((reference) => <li key={reference}>{reference}</li>)}</ul>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">No matching medical knowledge yet.</div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default MedicalLibrary;
