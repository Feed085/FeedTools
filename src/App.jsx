import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const ModernButton = ({ text, onClick, disabled, className, variant, ...props }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`modern-button ${disabled ? 'disabled' : ''} ${variant === 'danger' ? 'danger-button' : ''} ${className || ''}`}
        {...props}
    >
        <span>{text}</span>
    </button>
);

function App() {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('Ready');
    const [logs, setLogs] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [steamToolsFound, setSteamToolsFound] = useState(true);
    const [matches, setMatches] = useState(null);
    const [showMissingDialog, setShowMissingDialog] = useState(false);

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

    const [currentView, setCurrentView] = useState('home'); // 'home' or 'tool'
    const [videoIndex, setVideoIndex] = useState(0);
    const videos = [
        '/videos/rdr2.mp4',
        '/videos/tlou.mp4',
        '/videos/gow.mp4'
    ];

    const handleVideoEnd = () => {
        setVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
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

    return (
        <div className="app-container">
            {currentView === 'home' && (
                <div className="video-background">
                    <video
                        key={videos[videoIndex]}
                        autoPlay
                        muted
                        playsInline
                        onEnded={handleVideoEnd}
                        className="bg-video"
                        onCanPlay={(e) => e.target.play()}
                    >
                        <source src={videos[videoIndex]} type="video/mp4" />
                    </video>
                    <div className="video-overlay"></div>
                </div>
            )}

            <nav className="navbar">
                <div className="nav-left">
                    <img src="./src/assets/logo.png" alt="Logo" className="nav-logo" />
                    <span className="nav-brand">FeedTools</span>
                </div>
                <div className="nav-center">
                    <button className={`nav-link ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')}>Ana Sayfa</button>
                    <button className="nav-link" onClick={() => alert("Paketler yakında!")}>Paketler</button>
                    <button className="nav-link" onClick={() => alert("Görüntüler yakında!")}>Görüntüler</button>
                    <button className="nav-link" onClick={() => alert("Yorumlar yakında!")}>Yorumlar</button>
                    <button className="nav-link" onClick={() => alert("SSS yakında!")}>SSS</button>
                    <button className="nav-link special-link" onClick={() => alert("Deneme sürümü yakında!")}>Deneme Sürümü</button>
                    <button className={`nav-link ${currentView === 'tool' ? 'active' : ''}`} onClick={() => setCurrentView('tool')}>Kütüphane Yönetimi</button>
                </div>

                <div className="nav-right">
                    <div className="nav-actions">
                        <button className="icon-btn" title="Ara">🔍</button>
                        <div
                            className="lang-dropdown-container"
                            ref={langDropdownRef} // Attach ref here
                        >
                            <button
                                className="lang-btn"
                                onClick={() => setShowLangMenu(!showLangMenu)}
                            >
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

            {currentView === 'home' ? (
                <div className="landing-page">
                    <div className="hero-section">
                        <h1 className="hero-title">Oyun Dünyasına FeedTools ile Adım At</h1>
                        <p className="hero-subtitle">
                            Steam kütüphanenizi en verimli şekilde yönetin. Aylık özel abonelik paketlerimizle
                            düşük maliyetle geniş oyun arşivlerine erişin, sınırsız eğlencenin tadını çıkarın.
                            FeedTools ile oyun alışverişinde yeni bir dönem başlıyor!
                        </p>
                        <div className="hero-actions">
                            <ModernButton text="Hemen Keşfet" onClick={() => setCurrentView('tool')} />
                            <ModernButton
                                text="Paketleri İncele"
                                onClick={() => alert("Abonelik paketleri çok yakında burada olacak!")}
                                style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'none' }}
                            />
                        </div>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card glass-card">
                            <h3>Aylık Paketler</h3>
                            <p>Ekonomik ve esnek abonelik seçenekleriyle yüzlerce oyuna anında erişim sağlayın.</p>
                        </div>
                        <div className="feature-card glass-card">
                            <h3>Yüksek Hız</h3>
                            <p>En son teknolojimizle oyun kurulumlarını saniyeler içinde tamamlayın.</p>
                        </div>
                        <div className="feature-card glass-card">
                            <h3>Kolay Yönetim</h3>
                            <p>Karmaşık Steam işlemlerini tek bir butona indirgeyen kullanıcı dostu arayüz.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <header className="title-section">
                        <h1 className="title">FeedTools</h1>
                        <p className="subtitle">High-speed Steam game library manager</p>
                    </header>

                    <main className="glass-card flex-column" style={{ gap: '20px' }}>
                        <div className="input-group">
                            <label className="input-label">Search Steam Database</label>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="search-input"
                                placeholder="Enter game name, App ID or Steam URL..."
                                autoFocus
                            />
                        </div>

                        <div className="button-container">
                            <ModernButton
                                text={isProcessing ? "Processing..." : "Search & Install"}
                                onClick={handleSearch}
                                disabled={isProcessing}
                            />
                        </div>
                    </main>

                    <section className="glass-card progress-section">
                        <div className="status-header">
                            <div className="input-label">System Status</div>
                            <div className="status-badge">{status}</div>
                        </div>

                        {isProcessing && (
                            <div className="progress-bar-container">
                                <div className="progress-bar-fill"></div>
                            </div>
                        )}

                        <div className="log-title">
                            <span>⚡</span> Activity Log
                        </div>
                        <div className="log-container">
                            {logs.length === 0 ? (
                                <div className="log-line" style={{ opacity: 0.4 }}>Waiting for input...</div>
                            ) : (
                                logs.map((log, i) => <div key={i} className="log-line">{log}</div>)
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </section>
                </>
            )}

            {/* Popups remain available globally */}
            {matches && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>Found Multiple Matches</h2>
                            <p>Which game would you like to install?</p>
                        </div>
                        <div className="modal-content">
                            <ul className="match-list">
                                {matches.map((m) => (
                                    <li key={m.appid} onClick={() => handleSelectMatch(m.appid)}>
                                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                                        <span className="appid-tag">ID: {m.appid}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="modal-actions">
                                <ModernButton
                                    text="Cancel"
                                    onClick={() => { setMatches(null); setIsProcessing(false); setStatus('Ready'); }}
                                    variant="danger"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Missing Tool Popup */}
            {showMissingDialog && (
                <div className="modal-overlay">
                    <div className="modal" style={{ borderColor: '#ff6b6b' }}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ff4d4d 0%, #991b1b 100%)' }}>
                            <h2>SteamTools Required</h2>
                        </div>
                        <div className="modal-content" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
                            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                                SteamTools.exe is required to use this application.<br />
                                Please download and install it to continue.
                            </p>
                            <div className="modal-actions">
                                <ModernButton
                                    text="Download SteamTools"
                                    onClick={() => window.open("https://steamtools.net/download", "_blank")}
                                />
                                <ModernButton
                                    text="Close"
                                    onClick={() => setShowMissingDialog(false)}
                                    variant="secondary"
                                    style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}
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
