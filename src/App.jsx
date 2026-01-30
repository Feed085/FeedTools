import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const ModernButton = ({ text, onClick, disabled, className, ...props }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`modern-button ${disabled ? 'disabled' : ''} ${className || ''}`}
        {...props}
    >
        {text}
    </button>
);

function App() {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('Ready');
    const [logs, setLogs] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [steamToolsFound, setSteamToolsFound] = useState(true);
    const [matches, setMatches] = useState(null); // Array of matches for popup
    const [showMissingDialog, setShowMissingDialog] = useState(false);

    const logEndRef = useRef(null);

    useEffect(() => {
        // Initial check
        window.api.checkSteamTools();
        window.api.onSteamToolsCheck((exists) => {
            setSteamToolsFound(exists);
            if (!exists) setShowMissingDialog(true);
        });

        // Event listeners
        window.api.onLog((msg) => {
            setLogs(prev => [...prev, msg]);
        });
        window.api.onStatus((msg) => setStatus(msg));
        window.api.onSearchError((msg) => {
            alert(msg);
            setIsProcessing(false);
            setStatus('Ready');
        });
        window.api.onShowSelection((foundMatches) => {
            setMatches(foundMatches);
        });
        window.api.onProcessComplete((result) => {
            if (result.success) {
                alert("Success: " + result.message);
            } else {
                alert("Error: " + result.message);
            }
            setIsProcessing(false);
            setStatus('Ready');
        });

    }, []);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    const handleSearch = () => {
        if (isProcessing) return;
        if (!steamToolsFound) {
            setShowMissingDialog(true);
            return;
        }
        if (!query.trim()) {
            alert("Please enter a game name, App ID, or URL");
            return;
        }

        setIsProcessing(true);
        setLogs([]);
        setStatus('Searching...');
        window.api.startDownload(query);
    };

    const handleSelectMatch = (appid) => {
        setMatches(null);
        window.api.confirmSelection(appid);
    };

    return (
        <div className="app-container">
            <h1 className="title">FeedTools</h1>
            <p className="subtitle">Enter game name, App ID or Steam URL</p>

            <div className="card input-card">
                <label>Search for Game</label>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="search-input"
                    placeholder="e.g., Cyberpunk 2077"
                />
            </div>

            <div className="button-container">
                <ModernButton
                    text="Search & Install"
                    onClick={handleSearch}
                    disabled={isProcessing} sa
                />
            </div>

            <div className="card progress-card">
                <div className="status-label">{status}</div>
                {isProcessing && <div className="progress-bar-container"><div className="progress-bar-fill"></div></div>}

                <label style={{ marginTop: '10px', display: 'block' }}>Activity Log</label>
                <div className="log-container">
                    {logs.map((log, i) => <div key={i} className="log-line">{log}</div>)}
                    <div ref={logEndRef} />
                </div>
            </div>

            {/* Selection Popup */}
            {matches && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>🔍 Found Similar Games</h2>
                            <p>Multiple games matched '{query}'. Please select one:</p>
                        </div>
                        <div className="modal-content">
                            <ul className="match-list">
                                {matches.map((m) => (
                                    <li key={m.appid} onClick={() => handleSelectMatch(m.appid)}>
                                        {m.name} <span className="appid-tag">(ID: {m.appid})</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="modal-actions">
                                <ModernButton text="Cancel" onClick={() => { setMatches(null); setIsProcessing(false); setStatus('Ready'); }} style={{ background: '#ff6b6b' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Missing Tool Popup */}
            {showMissingDialog && (
                <div className="modal-overlay">
                    <div className="modal" style={{ borderColor: '#ff6b6b' }}>
                        <div className="modal-header" style={{ background: '#ff6b6b' }}>
                            <h2>⚠️ SteamTools Not Found</h2>
                        </div>
                        <div className="modal-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📥</div>
                            <p>SteamTools.exe is required to use this application.<br />Please download and install it first.</p>
                            <div className="modal-actions" style={{ justifyContent: 'center' }}>
                                <ModernButton text="⬇️ Download SteamTools" onClick={() => window.open("https://steamtools.net/download", "_blank")} />
                                <ModernButton text="Close" onClick={() => setShowMissingDialog(false)} style={{ background: '#414868' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default App;
