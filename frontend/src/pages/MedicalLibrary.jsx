import { useMemo, useState } from 'react';
import PageContainer from '../components/PageContainer';

const libraryItems = [
  {
    title: 'Pneumonia',
    summary: 'An infection that causes inflammation in the air sacs of the lungs, which may fill with fluid or pus.',
    symptoms: ['Fever', 'Cough with phlegm', 'Shortness of breath', 'Chest pain', 'Fatigue', 'Confusion (especially in older adults)'],
    treatment: ['Antibiotics (bacterial pneumonia)', 'Antivirals (viral pneumonia)', 'Oxygen support', 'Hydration', 'Rest', 'Fever reducers'],
    riskFactors: ['Age 65+', 'Chronic lung disease', 'Smoking', 'Weakened immune system', 'Recent hospitalization'],
    prevention: ['Vaccination (pneumococcal, flu)', 'Hand washing', 'Avoid smoking', 'Healthy lifestyle'],
    references: ['CDC Guidelines', 'ATS/IDSA Clinical Practice Guidelines', 'WHO Pneumonia Recommendations'],
  },
  {
    title: 'Tuberculosis',
    summary: 'A bacterial infection caused by Mycobacterium tuberculosis that most commonly affects the lungs but can spread to other organs.',
    symptoms: ['Persistent cough (3+ weeks)', 'Coughing up blood', 'Weight loss', 'Night sweats', 'Fatigue', 'Fever', 'Chest pain'],
    treatment: ['Multi-drug antibiotics (6-9 months)', 'Isoniazid', 'Rifampin', 'Pyrazinamide', 'Ethambutol', 'Directly observed therapy (DOT)'],
    riskFactors: ['Weakened immune system', 'HIV/AIDS', 'Diabetes', 'Close contact with TB patient', 'Travel to high-risk areas'],
    prevention: ['BCG vaccination', 'Screening for latent TB', 'Infection control measures', 'Mask use in healthcare settings'],
    references: ['WHO TB Guidelines', 'CDC TB Treatment Guidelines', 'American Thoracic Society Standards'],
  },
  {
    title: 'COVID-19',
    summary: 'A respiratory infection caused by SARS-CoV-2 virus, ranging from mild to severe respiratory illness.',
    symptoms: ['Fever or chills', 'Cough', 'Shortness of breath', 'Fatigue', 'Loss of taste or smell', 'Sore throat', 'Body aches', 'Headache'],
    treatment: ['Supportive care', 'Rest and hydration', 'Antiviral medications (high-risk patients)', 'Oxygen therapy', 'Corticosteroids (severe cases)'],
    riskFactors: ['Age 65+', 'Underlying health conditions', 'Immunocompromised', 'Obesity', 'Pregnancy'],
    prevention: ['COVID-19 vaccination', 'Mask wearing', 'Social distancing', 'Hand hygiene', 'Ventilation'],
    references: ['WHO COVID-19 Guidelines', 'CDC Treatment Guidelines', 'NIH Treatment Protocols'],
  },
  {
    title: 'Lung Cancer',
    summary: 'A malignant tumor arising from the cells of the lungs, primarily caused by smoking but also occurring in non-smokers.',
    symptoms: ['Persistent cough', 'Coughing up blood', 'Chest pain', 'Hoarseness', 'Weight loss', 'Shortness of breath', 'Recurring infections'],
    treatment: ['Surgical resection', 'Radiation therapy', 'Chemotherapy', 'Targeted therapy', 'Immunotherapy', 'Palliative care'],
    riskFactors: ['Smoking', 'Secondhand smoke', 'Radon exposure', 'Asbestos exposure', 'Family history', 'Air pollution'],
    prevention: ['Smoking cessation', 'Avoid carcinogens', 'Radon testing', 'Regular screenings (high-risk individuals)'],
    references: ['NCCN Guidelines', 'American Cancer Society', 'ASCO Lung Cancer Guidelines'],
  },
  {
    title: 'Asthma',
    summary: 'A chronic condition in which airways narrow and swell, producing extra mucus and causing breathing difficulties.',
    symptoms: ['Shortness of breath', 'Chest tightness', 'Wheezing', 'Coughing (worse at night)', 'Difficulty sleeping'],
    treatment: ['Inhaled corticosteroids', 'Long-acting bronchodilators', 'Quick-relief inhalers', 'Oral medications', 'Allergy medications'],
    riskFactors: ['Family history', 'Allergies', 'Obesity', 'Smoking', 'Air pollution', 'Occupational exposure'],
    prevention: ['Identify and avoid triggers', 'Take prescribed medications', 'Monitor symptoms', 'Create asthma action plan'],
    references: ['GINA Guidelines', 'NIH Asthma Guidelines', 'American Lung Association'],
  },
  {
    title: 'Chronic Obstructive Pulmonary Disease (COPD)',
    summary: 'A group of lung diseases including emphysema and chronic bronchitis that block airflow and make breathing difficult.',
    symptoms: ['Chronic cough', 'Shortness of breath', 'Wheezing', 'Chest tightness', 'Frequent respiratory infections', 'Fatigue'],
    treatment: ['Bronchodilators', 'Inhaled steroids', 'Oxygen therapy', 'Pulmonary rehabilitation', 'Smoking cessation'],
    riskFactors: ['Smoking (primary cause)', 'Occupational exposure', 'Air pollution', 'Genetic factors (alpha-1 antitrypsin deficiency)'],
    prevention: ['Smoking cessation', 'Avoid lung irritants', 'Vaccinations (flu, pneumonia)', 'Regular exercise'],
    references: ['GOLD Guidelines', 'COPD Foundation', 'American Thoracic Society'],
  },
  {
    title: 'Pulmonary Embolism',
    summary: 'A blockage in one of the pulmonary arteries in the lungs, usually caused by blood clots that travel to the lungs from deep veins in the legs.',
    symptoms: ['Sudden shortness of breath', 'Chest pain (worse with breathing)', 'Cough (may be bloody)', 'Rapid heart rate', 'Lightheadedness', 'Excessive sweating'],
    treatment: ['Anticoagulants (blood thinners)', 'Thrombolytics (clot dissolvers)', 'Surgical embolectomy', 'Inferior vena cava filter'],
    riskFactors: ['Deep vein thrombosis', 'Prolonged immobility', 'Surgery', 'Cancer', 'Pregnancy', 'Hormone therapy'],
    prevention: ['Blood thinners (high-risk)', 'Compression stockings', 'Leg exercises during travel', 'Stay hydrated', 'Move regularly'],
    references: ['CHEST Guidelines', 'American Heart Association', 'American College of Chest Physicians'],
  },
  {
    title: 'Pulmonary Fibrosis',
    summary: 'A lung disease that occurs when lung tissue becomes damaged and scarred, making it difficult to breathe.',
    symptoms: ['Shortness of breath (dyspnea)', 'Dry cough', 'Fatigue', 'Unexplained weight loss', 'Muscle and joint aches', 'Clubbing of fingers'],
    treatment: ['Antifibrotic medications', 'Oxygen therapy', 'Pulmonary rehabilitation', 'Lung transplant (severe cases)', 'Symptom management'],
    riskFactors: ['Age 50-70', 'Smoking', 'Occupational exposure', 'Radiation therapy', 'Genetic factors', 'Autoimmune diseases'],
    prevention: ['Avoid smoking', 'Protect lungs from occupational hazards', 'Early detection and treatment', 'Regular medical check-ups'],
    references: ['ATS/ERS Guidelines', 'Pulmonary Fibrosis Foundation', 'NIH Research'],
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
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-rose-400">Risk Factors</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{filteredItems[0].riskFactors.map((factor) => <li key={factor}>{factor}</li>)}</ul>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm font-semibold text-purple-400">Prevention</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{filteredItems[0].prevention.map((item) => <li key={item}>{item}</li>)}</ul>
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
