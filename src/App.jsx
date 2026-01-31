import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import ModernButton from './components/ModernButton';

function App() {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('Ready');
    const [logs, setLogs] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [steamToolsFound, setSteamToolsFound] = useState(true);
    const [matches, setMatches] = useState(null);
    const [showMissingDialog, setShowMissingDialog] = useState(false);
    const [currentView, setCurrentView] = useState('tool'); // Default to 'tool' for Electron app

    const logEndRef = useRef(null);
    const langDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
                setShowLangMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const [showLangMenu, setShowLangMenu] = useState(false);
    const [selectedLang, setSelectedLang] = useState('TR');
    const languages = [
        { code: 'TR', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'EN', name: 'English', flag: '🇺🇸' },
        { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'FR', name: 'Français', flag: '🇫🇷' },
        { code: 'ES', name: 'Español', flag: '🇪🇸' },
        { code: 'RU', name: 'Русский', flag: '🇷🇺' }
    ];

    const renderContent = () => {
        switch (currentView) {
            case 'tool':
                return (
                    <div className="flex-column" style={{ height: '100%', padding: '20px' }}>
                        <header className="title-section">
                            <h1 className="title">Kütüphane Yönetimi</h1>
                            <p className="subtitle">Steam veritabanında ara ve kütüphaneni genişlet</p>
                        </header>

                        <div className="tool-layout">
                            <section className="search-section">
                                <main className="glass-card flex-column" style={{ gap: '25px' }}>
                                    <div className="input-group">
                                        <label className="input-label">Oyun Ara</label>
                                        <div className="search-input-wrapper">
                                            <input
                                                type="text"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                className="search-input"
                                                placeholder="Oyun adı, App ID veya URL girin..."
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div className="button-container">
                                        <ModernButton
                                            text={isProcessing ? "İşleniyor..." : "Ara ve Yükle"}
                                            onClick={handleSearch}
                                            disabled={isProcessing}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </main>

                                <div className="glass-card" style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '14px', color: 'var(--accent-secondary)', marginBottom: '15px' }}>TIP</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                        Hızlı sonuç almak için direkt App ID (örneğin: 730) kullanabilirsiniz.
                                        İşlem başladığında sağ panelden logları anlık takip edebilirsiniz.
                                    </p>
                                </div>
                            </section>

                            <section className="progress-section">
                                <div className="glass-card progress-section">
                                    <div className="status-header">
                                        <div className="input-label">Sistem Durumu</div>
                                        <div className="status-badge">{status}</div>
                                    </div>

                                    <div className="progress-bar-container">
                                        {isProcessing && <div className="progress-bar-fill"></div>}
                                    </div>

                                    <div className="log-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                        <span>⚡</span> AKTİVİTE LOGLARI
                                    </div>
                                    <div className="log-container">
                                        {logs.length === 0 ? (
                                            <div className="log-line" style={{ opacity: 0.4 }}>Komut bekleniyor...</div>
                                        ) : (
                                            logs.map((log, i) => <div key={i} className="log-line">{log}</div>)
                                        )}
                                        <div ref={logEndRef} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                );
            case 'support':
                return (
                    <div className="landing-page" style={{ justifyContent: 'center' }}>
                        <div className="hero-section">
                            <h1 className="hero-title">Destek Merkezi</h1>
                            <p className="hero-subtitle">
                                Herhangi bir sorun yaşarsanız Discord sunucumuza katılarak veya bize yazarak destek alabilirsiniz.
                            </p>
                            <ModernButton
                                text="Discord Sunucusuna Katıl"
                                variant="primary"
                                onClick={() => window.open('https://discord.gg/feedtools', '_blank')}
                            />
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="landing-page" style={{ justifyContent: 'center' }}>
                        <div className="hero-section">
                            <h1 className="hero-title">Hoşgeldiniz</h1>
                            <p className="hero-subtitle">Lütfen menüden bir işlem seçin.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="app-container">
            <nav className="navbar">
                <div className="nav-left">
                    <img src="./src/assets/logo.png" alt="Logo" className="nav-logo" />
                    <span className="nav-brand">FEEDTOOLS</span>
                </div>
                <div className="nav-center">
                    <button className={`nav-link ${currentView === 'tool' ? 'active' : ''}`} onClick={() => setCurrentView('tool')}>KÜTÜPHANE</button>
                    <button className={`nav-link ${currentView === 'support' ? 'active' : ''}`} onClick={() => setCurrentView('support')}>DESTEK</button>
                    <button className="nav-link" onClick={() => window.api.toggleFullScreen()}>TAM EKRAN</button>
                </div>

                <div className="nav-right">
                    <div className="nav-actions">
                        <div className="lang-dropdown-container" ref={langDropdownRef}>
                            <button className="lang-btn" onClick={() => setShowLangMenu(!showLangMenu)}>
                                <span className="lang-icon">🌐</span>
                                {selectedLang}
                            </button>
                            {showLangMenu && (
                                <div className="lang-menu">
                                    {languages.map(lang => (
                                        <div
                                            key={lang.code}
                                            className="lang-item"
                                            onClick={() => {
                                                setSelectedLang(lang.code);
                                                setShowLangMenu(false);
                                            }}
                                        >
                                            <span className="lang-flag">{lang.flag}</span>
                                            <span className="lang-name">{lang.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {renderContent()}
            </div>

            {/* Modals */}
            {matches && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Birden Fazla Sonuç</h2>
                            <p>Hangi oyunu yüklemek istiyorsunuz?</p>
                        </div>
                        <div className="modal-content">
                            <ul className="match-list">
                                {matches.map((m) => (
                                    <li key={m.appid} className="match-item" onClick={() => handleSelectMatch(m.appid)}>
                                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                                        <span className="appid-tag">ID: {m.appid}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="modal-actions">
                                <ModernButton
                                    text="İptal Et"
                                    onClick={() => { setMatches(null); setIsProcessing(false); setStatus('Ready'); }}
                                    variant="danger"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showMissingDialog && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)' }}>
                            <h2>SteamTools Gerekli</h2>
                        </div>
                        <div className="modal-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
                            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                                Bu uygulamayı kullanabilmek için SteamTools.exe gereklidir.<br />
                                Lütfen devam etmek için indirip kurun.
                            </p>
                            <div className="modal-actions">
                                <ModernButton
                                    text="SteamTools İndir"
                                    onClick={() => window.open("https://steamtools.net/download", "_blank")}
                                />
                                <ModernButton
                                    text="Kapat"
                                    onClick={() => setShowMissingDialog(false)}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
