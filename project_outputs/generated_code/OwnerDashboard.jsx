import React, { useState, useEffect, useCallback, useMemo } from 'react';

const AuditLogEntry = ({ entry, rate }) => {
    const data = typeof entry === 'string' ? JSON.parse(entry) : entry;
    const { timestamp, agent_name, action, tokens, cost_usd, status } = data;
    const costAUD = cost_usd * rate;

    return (
        <div className={`flex justify-between items-start font-mono text-xs p-2 rounded-md transition-all duration-150 
            ${status === 'ERROR' ? 'bg-red-100' : status === 'READY' ? 'bg-blue-100' : 'bg-gray-100'} hover:shadow-inner`}>
            <div className="flex-1 min-w-0">
                <span className="text-gray-500 mr-2">[${new Date(timestamp).toLocaleTimeString()}]</span>
                <span className="font-semibold text-blue-800">${agent_name}:</span>
                <span className={status === 'ERROR' ? 'text-red-700 font-bold' : 'text-gray-700'}>${action}</span>
            </div>
            <div className="text-right ml-4 whitespace-nowrap">
                <span className="text-yellow-600 mr-2">${tokens.toLocaleString()} tokens</span>
                <span className="text-green-600 font-medium">AUD ${costAUD.toFixed(4)}</span>
            </div>
        </div>
    );
};

const App = () => {
    const [metrics, setMetrics] = useState({
        total_simulated_cost_aud: 0.00,
        total_tokens_used: 0,
        cost_conversion_rate: 1.50,
    });
    const [auditLog, setAuditLog] = useState([]);
    const [isVetoActive, setIsVetoActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE_URL = 'http://localhost:8000';

    const fetchMetricsAndLog = useCallback(async () => {
        try {
            const metricsRes = await fetch(`${API_BASE_URL}/api/status`);
            const metricsData = await metricsRes.json();
            setMetrics(metricsData);
            setIsVetoActive(!metricsData.agent_active_status);

            const logRes = await fetch(`${API_BASE_URL}/api/audit/log`);
            const logData = await logRes.json();
            setAuditLog(logData);
            
        } catch (error) {
            console.error("Failed to fetch data or API not running:", error);
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchMetricsAndLog();
        const interval = setInterval(fetchMetricsAndLog, 3000); 
        return () => clearInterval(interval);
    }, [fetchMetricsAndLog]);

    const handleVetoToggle = useCallback(async () => {
        const newVetoStatus = !isVetoActive;
        const newAgentStatus = !newVetoStatus;

        try {
            const res = await fetch(`${API_BASE_URL}/api/veto/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent_active_status: newAgentStatus }),
            });
            if (res.ok) {
                setIsVetoActive(newVetoStatus);
                fetchMetricsAndLog(); 
            } else {
                console.error("Failed to toggle veto.");
            }
        } catch (error) {
            console.error("Network error during veto toggle:", error);
        }
    }, [isVetoActive, fetchMetricsAndLog, API_BASE_URL]);

    const runSimulatedAgent = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/agent/simulate_run`, { method: 'POST' });
            if (!res.ok) {
                const errorDetail = await res.json();
                console.error("Agent simulation failed:", errorDetail.detail);
                alert(`Error: ${errorDetail.detail}. Check Veto Status.`);
            }
            fetchMetricsAndLog();
        } catch (error) {
            console.error("Network error during simulation:", error);
            alert("Connection error. Ensure the FastAPI backend is running.");
        }
    }, [fetchMetricsAndLog, API_BASE_URL]);

    const displayCostAUD = metrics.total_simulated_cost_aud.toFixed(2);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-xl font-bold text-gray-500">Loading Agent State...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
                body { font-family: 'Inter', sans-serif; }
            `}</style>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-extrabold text-gray-800 mb-6">
                    MAA Owner's Accountability Dashboard
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    
                    <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-blue-600 md:col-span-1">
                        <p className="text-sm font-medium text-gray-500">SIMULATED TOTAL COST</p>
                        <h2 className="text-4xl font-extrabold text-gray-900 mt-1">AUD ${displayCostAUD}</h2>
                        <div className="text-xs text-gray-400 mt-2">
                            ${metrics.total_tokens_used.toLocaleString()} Total Tokens
                            <br />
                            Rate: USD 1.00 = AUD ${metrics.cost_conversion_rate.toFixed(2)}
                        </div>
                    </div>

                    <div className={`p-6 rounded-xl shadow-lg transition duration-300 md:col-span-2 
                        ${isVetoActive ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                        <p className="text-sm font-medium">AGENT EXECUTION STATUS (VETO CONTROL)</p>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center">
                                <svg className={`w-8 h-8 mr-3 ${isVetoActive ? 'opacity-70' : 'animate-pulse'}`} fill="currentColor" viewBox="0 0 20 20">
                                    {isVetoActive ? (
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    ) : (
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.707-9.293a1 1 0 011.414 0L10 10.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    )}
                                </svg>
                                <h2 className="text-3xl font-bold">
                                    {isVetoActive ? 'PAUSED' : 'ACTIVE'}
                                </h2>
                            </div>
                            <button onClick={handleVetoToggle} className={`py-3 px-6 font-bold rounded-lg transition duration-150 shadow-md 
                                ${isVetoActive ? 'bg-white text-red-600 hover:bg-gray-100' : 'bg-gray-800 text-white hover:bg-gray-900'}`}>
                                {isVetoActive ? 'RESUME AGENTS (RELEASE VETO)' : 'PAUSE ALL AGENTS (VETO)'}
                            </button>
                        </div>
                        <p className="text-sm mt-3 opacity-80">
                            **Veto Status:** Your ultimate control. Pausing agents prevents **all paid API calls** immediately.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border-b-4 border-blue-600">
                        <p className="text-sm font-medium text-gray-500">SIMULATION/TESTING</p>
                        <h2 className="text-xl font-bold text-gray-900 mt-1">Run Test Agent</h2>
                         <button onClick={runSimulatedAgent} disabled={isVetoActive} 
                            className={`mt-4 w-full py-2 font-bold rounded-lg transition duration-150 shadow-md 
                                ${isVetoActive ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            {isVetoActive ? 'VETO ACTIVE (Cannot Run)' : 'RUN AGENT SIMULATION'}
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                           Triggers a mock AI run and updates cost in AUD.
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Real-Time Action Monitor Log (Audit Trail)</h3>
                    <div className="h-96 overflow-y-scroll p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-1">
                        {auditLog.map((entry, index) => (
                            <AuditLogEntry key={index} entry={JSON.stringify(entry)} rate={metrics.cost_conversion_rate} />
                        ))}
                        <div ref={(el) => { if (el) el.scrollIntoView({ behavior: 'smooth' }); }} />
                    </div>
                </div>
            </div>
            <footer className="text-center text-gray-500 text-xs mt-8">
                **Learning Insight:** To run this application locally, you must first start the FastAPI backend (main.py) in your VS Code terminal.
            </footer>
        </div>
    );
};

export default App;
