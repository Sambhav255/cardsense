import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, CreditCard, Search, X, ShieldCheck, CheckCircle } from 'lucide-react';
import { analyzeStatement, validateFile } from './utils/aiHandler';
import cardsData from './data/cards.json';

export default function App() {
  // --- Core State ---
  const [view, setView] = useState('landing'); 
  const [spending, setSpending] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [currentCardId, setCurrentCardId] = useState('baseline');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quizData, setQuizData] = useState({ dining: 0, grocery: 0, travel: 0, rent: 0, other: 0 });
  const [uploadError, setUploadError] = useState(null);

  // --- Logic: The Valuation Engine (spendData = monthly $ per category) ---
  const runScoring = (spendData) => {
    const scored = cardsData.map(card => {
      let annualRewards = 0;
      for (let cat in spendData) {
        const monthlySpend = spendData[cat] || 0;
        const multiplier = card.multipliers[cat] || card.multipliers['other'] || 1;
        annualRewards += (monthlySpend * 12 * multiplier) * card.pointValue;
      }
      return {
        ...card,
        id: card.name,
        annualRewards,
        netAnnualValue: annualRewards - card.annualFee
      };
    }).sort((a, b) => b.netAnnualValue - a.netAnnualValue);

    setRecommendations(scored);
    setView('results');
  };

  // --- Path 1: Robust Direct Analysis ---
  const handleUpload = async (e) => {
    const file = e.target ? e.target.files[0] : e;
    if (!file) return;

    setUploadError(null);
    const validation = validateFile(file);
    if (!validation.isValid) {
      setUploadError(validation.errors[0] || 'Invalid file');
      if (e.target) e.target.value = null;
      return;
    }

    setIsAnalyzing(true);
    try {
      const text = await file.text();
      const trimmed = text?.trim();
      if (!trimmed) {
        setUploadError('The file is empty. Use a CSV or text file with transaction data.');
        setIsAnalyzing(false);
        if (e.target) e.target.value = null;
        return;
      }
      const spendData = await analyzeStatement(trimmed);
      if (spendData) {
        setSpending(spendData);
        runScoring(spendData);
      } else {
        setUploadError('We couldn’t analyze this file. Try again or use Quick Estimate.');
      }
    } catch (err) {
      const msg = err?.message ?? '';
      const code = err?.code ?? '';
      if (code === 'network' || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        setUploadError('Cannot reach the analysis service. Is the server running?');
      } else if (code === 'quota_exceeded' || msg.includes('429')) {
        setUploadError('Rate limit reached. Please try again in a few minutes.');
      } else if (code === 'invalid_api_key' || msg.includes('403')) {
        setUploadError('Server configuration error. Please try again later.');
      } else {
        setUploadError(err?.message || 'Analysis failed. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
      if (e.target) e.target.value = null;
    }
  };

  // --- Path 2: Estimation Pipeline ---
  const handleQuiz = (e) => {
    e.preventDefault();
    setSpending(quizData);
    runScoring(quizData);
  };

  // --- Comparative Logic: Incremental Value Delta ---
  const currentCard = recommendations.find(c => c.id === currentCardId);
  const totalMonthlySpend = spending ? Object.values(spending).reduce((a, b) => a + b, 0) : 0;
  const baselineValue = totalMonthlySpend * 12 * 0.01;

  const currentNetValue = currentCardId === 'baseline' ? baselineValue : (currentCard?.netAnnualValue || 0);
  const bestNetValue = recommendations[0]?.netAnnualValue || 0;
  const moneyWasted = Math.max(0, bestNetValue - currentNetValue);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white antialiased">
      {/* Editorial Header */}
      <nav className="border-b-2 border-black py-8 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div onClick={() => { setView('landing'); setUploadError(null); }} className="cursor-pointer">
            <h1 className="text-4xl font-black tracking-tighter leading-none uppercase">CARDSENSE</h1>
            <p className="text-[10px] font-bold tracking-[0.3em] opacity-40 uppercase mt-2">Quantitative Reward Modeling</p>
          </div>
          <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-widest opacity-40">
            <span className="flex items-center gap-1"><ShieldCheck size={12}/> Privacy Secured</span>
            <span className="flex items-center gap-1"><CheckCircle size={12}/> Unbiased Data</span>
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {/* VIEW: LANDING */}
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto">
            <header className="py-24 px-6 border-b border-black text-center">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase mb-12 italic">The<br/>Optimizer</h2>
              <p className="text-xl font-light max-w-2xl mx-auto opacity-70">
                Analyze your real-world spending habits with AI to find your mathematically perfect card stack.
              </p>
            </header>

            <div className="grid md:grid-cols-2 bg-black gap-px border-b border-black">
              <div 
                className={`p-16 transition-all border-r border-black ${isDragging ? 'bg-black text-white' : 'bg-white'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files[0]); }}
              >
                <Upload className="mb-8" size={48} strokeWidth={1} />
                <h3 className="text-4xl font-black mb-4 uppercase tracking-tighter">Direct Analysis</h3>
                <p className="opacity-50 mb-10 font-medium text-sm">Upload a CSV or TXT statement for 100% data accuracy.</p>
                <input type="file" id="direct-upload" className="hidden" accept=".csv,.txt" onChange={handleUpload} />
                <label htmlFor="direct-upload" className="inline-block border-2 border-black px-10 py-4 font-black text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-all cursor-pointer text-center">
                  Select File
                </label>
                {uploadError && (
                  <p className="mt-6 text-sm font-medium text-red-600" role="alert">{uploadError}</p>
                )}
              </div>

              <div className="bg-white p-16 hover:bg-black hover:text-white transition-all group cursor-pointer" onClick={() => setView('quiz')}>
                <Search className="mb-8 group-hover:text-white transition-colors" size={48} strokeWidth={1} />
                <h3 className="text-4xl font-black mb-4 uppercase tracking-tighter">Quick Estimate</h3>
                <p className="opacity-50 mb-10 font-medium text-sm">No statement handy? Answer five questions to get your estimate.</p>
                <button className="w-full md:w-auto border-2 border-current px-10 py-4 font-black text-xs tracking-widest uppercase transition-all">
                  Start Engine
                </button>
              </div>
            </div>
            <footer className="max-w-7xl mx-auto py-12 px-6 text-center border-t border-black">
              <p className="text-[10px] font-bold tracking-widest opacity-40 uppercase">CardSense is for education only. Not financial or tax advice.</p>
            </footer>
          </motion.div>
        )}

        {/* VIEW: QUIZ */}
        {view === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-24 px-6">
            <div className="max-w-2xl mx-auto border-4 border-black p-12 md:p-16 relative">
              <button onClick={() => setView('landing')} className="absolute top-8 right-8 opacity-30 hover:opacity-100 transition-opacity"><X size={32}/></button>
              <h2 className="text-5xl font-black tracking-tighter uppercase mb-12">Spending Metrics</h2>
              <form onSubmit={handleQuiz} className="space-y-10">
                {['Dining', 'Grocery', 'Travel', 'Rent', 'Other'].map(cat => (
                  <div key={cat} className="group">
                    <label className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase block mb-2">{cat} Monthly Volume</label>
                    <input 
                      type="number" required placeholder="$0.00"
                      className="w-full border-b-2 border-black py-4 text-4xl font-black outline-none focus:border-blue-600 transition-colors bg-transparent"
                      onChange={(e) => setQuizData({...quizData, [cat.toLowerCase()]: Number(e.target.value)})}
                    />
                  </div>
                ))}
                <button type="submit" className="w-full bg-black text-white py-8 font-black text-lg uppercase tracking-[0.4em] hover:bg-slate-900 transition-all">
                  Generate Optimization
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* VIEW: RESULTS */}
        {view === 'results' && recommendations.length > 0 && spending && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-32 pb-32">
            <section className="max-w-7xl mx-auto px-6 pt-24 text-center border-b-4 border-black pb-24">
              <div className="max-w-xl mx-auto mb-16">
                <label className="text-[10px] font-black tracking-[0.3em] opacity-40 uppercase block mb-4 italic">Compare Against Your Current Card</label>
                <select 
                  value={currentCardId}
                  onChange={(e) => setCurrentCardId(e.target.value)}
                  className="w-full bg-white border-4 border-black p-6 text-xl font-black uppercase tracking-tighter cursor-pointer focus:bg-black focus:text-white transition-colors appearance-none"
                >
                  <option value="baseline">Baseline (Generic 1% Cashback)</option>
                  {cardsData.map(card => <option key={card.name} value={card.name}>{card.name}</option>)}
                </select>
              </div>
              <p className="text-[10px] font-black tracking-[0.4em] opacity-40 mb-8 uppercase">Annual Opportunity Cost</p>
              <h2 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none italic">
                ${Math.round(moneyWasted).toLocaleString()}
              </h2>
              <p className="text-xl font-light opacity-60 mt-8 max-w-2xl mx-auto">
                By switching from your current setup to the optimized stack, you increase your annual net yield by the amount above.
              </p>
            </section>

            <section className="max-w-7xl mx-auto px-6">
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-16">Data Audit</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 border-4 border-black bg-black gap-1">
                {Object.entries(spending).map(([cat, val]) => (
                  <div key={cat} className="bg-white p-6 md:p-10">
                    <span className="text-[10px] font-black tracking-widest opacity-40 uppercase block mb-4">{cat}</span>
                    <span className="text-2xl md:text-4xl font-black tracking-tighter">${Math.round(val || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="max-w-7xl mx-auto px-6">
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-16 italic">The Stack</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 border-4 border-black bg-black gap-1">
                {recommendations.slice(0, 6).map((card, i) => (
                  <div key={i} className="bg-white p-12 group hover:bg-black hover:text-white transition-all duration-500">
                    <div className="flex justify-between items-start mb-16">
                      <span className="text-[10px] font-black tracking-widest opacity-40 uppercase">Rank #{i + 1}</span>
                      {i === 0 && <span className="bg-black text-white px-4 py-1 text-[10px] font-black group-hover:bg-white group-hover:text-black">BEST MATCH</span>}
                    </div>
                    <h4 className="text-3xl font-black leading-none mb-4 uppercase tracking-tighter">{card.name}</h4>
                    <p className="text-xs font-bold opacity-50 mb-12 italic">{card.issuer} • ${card.annualFee} FEE</p>
                    <div className="space-y-4 mb-16 border-t border-current pt-8">
                      {Object.entries(card.multipliers).map(([cat, m]) => (
                        <div key={cat} className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-50">
                          <span>{cat}</span>
                          <span>{m}x</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t-4 border-current pt-8">
                      <p className="text-[10px] font-black tracking-widest opacity-40 mb-2 uppercase">Net Annual Value</p>
                      <p className="text-6xl font-black tracking-tighter">${Math.round(card.netAnnualValue).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <footer className="max-w-7xl mx-auto px-6 text-center">
              <button onClick={() => setView('landing')} className="text-xs font-black tracking-[0.4em] border-b-4 border-black pb-4 uppercase hover:opacity-40 transition-opacity">
                Recalculate Data Model
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnalyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 flex items-center justify-center p-6 text-center">
            <div>
              <Loader2 className="w-24 h-24 animate-spin mx-auto mb-8 stroke-[1px]" />
              <p className="text-sm font-black tracking-[0.5em] uppercase">Calculating Reward Delta</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}