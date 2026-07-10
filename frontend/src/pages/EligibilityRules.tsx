import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';

export const EligibilityRules: React.FC = () => {
  const { rules, fetchRules, updateRules } = useDashboard();
  const [stateWeight, setStateWeight] = useState(30);
  const [districtWeight, setDistrictWeight] = useState(20);
  const [incomeWeight, setIncomeWeight] = useState(20);
  const [ageWeight, setAgeWeight] = useState(15);
  const [occupationWeight, setOccupationWeight] = useState(15);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    if (rules) {
      setStateWeight(rules.state_weight);
      setDistrictWeight(rules.district_weight);
      setIncomeWeight(rules.income_weight);
      setAgeWeight(rules.age_weight);
      setOccupationWeight(rules.occupation_weight);
    }
  }, [rules]);

  const total = stateWeight + districtWeight + incomeWeight + ageWeight + occupationWeight;

  const handleSave = async () => {
    if (total !== 100) {
      setMsg('Error: Total weight sum must equal exactly 100.');
      setTimeout(() => setMsg(''), 4000);
      return;
    }
    const ok = await updateRules({
      state_weight: stateWeight,
      district_weight: districtWeight,
      income_weight: incomeWeight,
      age_weight: ageWeight,
      occupation_weight: occupationWeight
    });
    if (ok) {
      setMsg('Eligibility scoring weights updated successfully!');
    } else {
      setMsg('Failed to update weights.');
    }
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Eligibility Rule Weights</h1>
        <p className="font-body-md text-on-surface-variant">
          Adjust demographic criteria weights used by the scoring algorithm.
        </p>
      </div>

      {msg && (
        <div className={`p-md rounded font-bold text-center ${msg.includes('Error') ? 'bg-error-container/20 border border-error text-error' : 'bg-tertiary/20 border border-tertiary text-on-surface'}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-12 gap-gutter">
        {/* Sliders panel */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant rounded-xl p-lg space-y-lg">
          <h2 className="font-label-md text-on-surface font-bold uppercase pb-sm border-b border-outline-variant flex justify-between">
            <span>Demographics Weights Configuration</span>
            <span className={total === 100 ? 'text-tertiary' : 'text-error'}>Sum: {total} / 100</span>
          </h2>

          {/* State */}
          <div className="space-y-xs">
            <div className="flex justify-between font-label-sm">
              <span className="text-on-surface-variant">STATE RESIDENCY MATCH</span>
              <span className="font-mono-code font-bold text-primary">{stateWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary"
              value={stateWeight}
              onChange={(e) => setStateWeight(parseInt(e.target.value))}
            />
          </div>

          {/* District */}
          <div className="space-y-xs">
            <div className="flex justify-between font-label-sm">
              <span className="text-on-surface-variant">DISTRICT MATCH</span>
              <span className="font-mono-code font-bold text-primary">{districtWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary"
              value={districtWeight}
              onChange={(e) => setDistrictWeight(parseInt(e.target.value))}
            />
          </div>

          {/* Income */}
          <div className="space-y-xs">
            <div className="flex justify-between font-label-sm">
              <span className="text-on-surface-variant">ANNUAL INCOME BRACKET MATCH</span>
              <span className="font-mono-code font-bold text-primary">{incomeWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary"
              value={incomeWeight}
              onChange={(e) => setIncomeWeight(parseInt(e.target.value))}
            />
          </div>

          {/* Age */}
          <div className="space-y-xs">
            <div className="flex justify-between font-label-sm">
              <span className="text-on-surface-variant">AGE LIMITS MATCH</span>
              <span className="font-mono-code font-bold text-primary">{ageWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary"
              value={ageWeight}
              onChange={(e) => setAgeWeight(parseInt(e.target.value))}
            />
          </div>

          {/* Occupation */}
          <div className="space-y-xs">
            <div className="flex justify-between font-label-sm">
              <span className="text-on-surface-variant">OCCUPATION TYPE MATCH</span>
              <span className="font-mono-code font-bold text-primary">{occupationWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary"
              value={occupationWeight}
              onChange={(e) => setOccupationWeight(parseInt(e.target.value))}
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="bg-primary-container text-on-primary-container font-label-md px-xl py-md uppercase rounded-lg hover:opacity-90 active:scale-95 transition-all"
          >
            Apply Active Weights
          </button>
        </div>

        {/* Info Box */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h3 className="font-label-md text-on-surface font-bold uppercase pb-xs border-b border-outline-variant">
            Eligibility Logic Info
          </h3>
          <div className="font-body-sm text-on-surface-variant space-y-sm">
            <p>
              Scoring is calculated on a scale of 0 to 100. Matching criteria must exceed a threshold of <strong>50 points</strong> to recommend a program notification to a citizen.
            </p>
            <p>
              <strong>Hard Filters:</strong> Gender, caste categories, and disability qualifiers are evaluated as absolute flags. If a mismatch occurs, eligibility is set directly to 0.0, regardless of geographic weights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
