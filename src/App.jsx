import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const ModernButton = ({ text, onClick, disabled, className, variant, icon, ...props }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`modern-button ${disabled ? 'disabled' : ''} ${variant ? variant + '-button' : ''} ${className || ''}`}
        {...props}
    >
        {icon && <span className="button-icon">{icon}</span>}
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

    const [currentText, setCurrentText] = useState('');
    const [titleIndex, setTitleIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const titles = ["Sınırsız Eğlence", "Hızlı Kurulum", "Geniş Kütüphane", "Reiden Güvencesiyle"];

    useEffect(() => {
        const type = () => {
            const currentTitle = titles[titleIndex];
            const speed = isDeleting ? 50 : 100;

            if (!isDeleting && currentText === currentTitle) {
                setTimeout(() => setIsDeleting(true), 1500);
            } else if (isDeleting && currentText === '') {
                setIsDeleting(false);
                setTitleIndex((prev) => (prev + 1) % titles.length);
            } else {
                const nextText = isDeleting
                    ? currentTitle.substring(0, currentText.length - 1)
                    : currentTitle.substring(0, currentText.length + 1);
                setCurrentText(nextText);
            }
        };

        const timer = setTimeout(type, isDeleting ? 50 : 150);
        return () => clearTimeout(timer);
    }, [currentText, isDeleting, titleIndex]);

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
                    <span className="nav-brand">FEEDTOOLS</span>
                </div>
                <div className="nav-center">
                    <button className={`nav-link ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')}>ANASAYFA</button>
                    <button className="nav-link" onClick={() => alert("Paketler yakında!")}>PAKETLER</button>
                    <button className="nav-link" onClick={() => alert("Görüntüler yakında!")}>GALERİ</button>
                    <button className="nav-link" onClick={() => alert("SSS yakında!")}>DESTEK</button>
                    <button className={`nav-link ${currentView === 'tool' ? 'active' : ''}`} onClick={() => setCurrentView('tool')}>KÜTÜPHANE</button>
                </div>

                <div className="nav-right">
                    <div className="nav-actions">
                        <button className="icon-btn" title="Ara">🔍</button>
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
                {currentView === 'home' ? (
                    <div className="landing-page">
                        <div className="hero-section">
                            <div className="hero-badge">
                                <span className="hero-badge-dot"></span>
                                <span className="hero-badge-text">{currentText}</span>
                            </div>
                            <h1 className="hero-title">Oyun Dünyasına<br /><span className="highlight">FeedTools</span> ile Adım At</h1>
                            <p className="hero-subtitle">
                                Steam kütüphanenizi en verimli şekilde yönetin. Aylık özel abonelik paketlerimizle
                                geniş oyun arşivlerine düşük maliyetle erişin. Favori oyunlarınıza anında ulaşın,
                                kütüphanenizi tek bir tıkla zenginleştirmenin ve sınırsız eğlencenin tadını çıkarın.
                            </p>
                            <div className="hero-actions">
                                <ModernButton
                                    text="Hemen Keşfet"
                                    variant="primary"
                                    icon="✨"
                                    onClick={() => setCurrentView('tool')}
                                />
                                <ModernButton
                                    text="Paketleri İncele"
                                    variant="secondary"
                                    icon="💎"
                                    onClick={() => alert("Abonelik paketleri çok yakında burada olacak!")}
                                />
                            </div>
                        </div>

                        <div className="scroll-indicator" onClick={() => document.querySelector('.hero-section')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
                            <div className="mouse">
                                <div className="wheel"></div>
                            </div>
                            <div className="arrow">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-column" style={{ height: '100%' }}>
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
                )}
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
