"use client";

import React, { useState, useEffect } from 'react';

interface PublicSurvey {
    id: string;
    titulo: string;
    slug: string;
}

interface Metrics {
    total: number;
    avgAge: number;
    criticalAnxietyPercent: number;
    gad7Dist: {
        "Ansiedad mínima": number;
        "Ansiedad leve": number;
        "Ansiedad moderada": number;
        "Ansiedad severa": number;
        "No determinado / N/A": number;
    };
    topCareers: { name: string; count: number }[];
    yearDist: { name: string; count: number }[];
}

export default function PublicVisualization() {
    const [surveys, setSurveys] = useState<PublicSurvey[]>([]);
    const [selectedSlug, setSelectedSlug] = useState("mente-cuerpo-y-aula");
    
    const [loadingSurveys, setLoadingSurveys] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [surveyTitle, setSurveyTitle] = useState("");
    const [surveyDesc, setSurveyDesc] = useState("");
    
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 1. Cargar todas las encuestas activas públicas
    useEffect(() => {
        const fetchActiveSurveys = async () => {
            try {
                const res = await fetch('/api/survey?list=active');
                const data = await res.json();
                
                if (res.ok && data.success) {
                    setSurveys(data.surveys);
                    if (data.surveys.length > 0) {
                        // Intentar mantener 'mente-cuerpo-y-aula' como default, si no la primera de la lista
                        const hasFlagship = data.surveys.some((s: PublicSurvey) => s.slug === 'mente-cuerpo-y-aula');
                        if (!hasFlagship) {
                            setSelectedSlug(data.surveys[0].slug);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching surveys list", err);
            } finally {
                setLoadingSurveys(false);
            }
        };

        fetchActiveSurveys();
    }, []);

    // 2. Cargar estadísticas agregadas para la encuesta seleccionada
    useEffect(() => {
        if (!selectedSlug) return;

        const fetchStats = async () => {
            setLoadingStats(true);
            setErrorMsg(null);
            try {
                const res = await fetch(`/api/stats?slug=${selectedSlug}`);
                const data = await res.json();
                
                if (res.ok && data.success) {
                    setMetrics(data.metrics);
                    setSurveyTitle(data.survey.titulo);
                    setSurveyDesc(data.survey.descripcion);
                } else {
                    setErrorMsg(data.error || "No se pudieron cargar los datos analíticos.");
                }
            } catch (err) {
                setErrorMsg("No hay conexión con la base de datos de investigación.");
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, [selectedSlug]);

    const getGAD7Styles = (level: string) => {
        if (level === "Ansiedad mínima") return { color: "#10b981" };
        if (level === "Ansiedad leve") return { color: "#fbbf24" };
        if (level === "Ansiedad moderada") return { color: "#f97316" };
        if (level === "Ansiedad severa") return { color: "#ef4444" };
        return { color: "#9ca3af" };
    };

    return (
        <div className="bg-light min-h-screen font-sans pb-5">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
            
            {/* Cabecera del Portal de Datos */}
            <nav className="navbar navbar-dark bg-dark shadow-sm border-bottom border-secondary py-3 px-4">
                <div className="container d-flex justify-content-between align-items-center">
                    <span className="navbar-brand mb-0 h1 fw-normal fs-4 d-flex align-items-center">
                        <svg className="bi bi-graph-up me-2" width="24" height="24" fill="#a78bfa" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/>
                        </svg>
                        Portal Público de Resultados Estadísticos
                    </span>
                    <a href="/" className="btn btn-sm text-white" style={{ background: '#8b5cf6' }}>
                        Responder Encuesta
                    </a>
                </div>
            </nav>

            <div className="container mt-4">
                {/* 1. SECCIÓN: EXPLICATIVO INICIAL Y SELECCIÓN */}
                <div className="card shadow-sm border-0 p-4 mb-4 text-center text-sm-start" style={{ borderTop: '5px solid #8b5cf6' }}>
                    <div className="row align-items-center">
                        <div className="col-lg-8">
                            <h2 className="fw-normal text-purple-700">Visualización de Resultados Agregados</h2>
                            <p className="text-muted m-0">
                                Este portal interactivo presenta los análisis consolidados de las encuestas académicas de salud mental y hábitos demográficos. Para salvaguardar rigurosamente la privacidad y anonimato estudiantil, no se exponen registros individuales, solo métricas consolidadas globales de interés científico y social.
                            </p>
                        </div>
                        <div className="col-lg-4 mt-3 mt-lg-0">
                            {loadingSurveys ? (
                                <span className="small text-muted">Cargando catálogo...</span>
                            ) : (
                                <>
                                    <label className="form-label small fw-bold text-secondary text-uppercase mb-1">Encuesta Activa a Consultar</label>
                                    <select 
                                        value={selectedSlug} 
                                        onChange={(e) => setSelectedSlug(e.target.value)} 
                                        className="form-select py-2 border-purple"
                                        style={{ borderColor: 'rgba(139, 92, 246, 0.4)' }}
                                    >
                                        {surveys.map(s => (
                                            <option key={s.id} value={s.slug}>{s.titulo}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {loadingStats ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-purple" role="status" style={{ color: '#8b5cf6' }}>
                            <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p className="text-muted mt-2">Cargando visualizaciones públicas...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="alert alert-danger text-center p-4 shadow-sm">
                        <h4 className="fw-bold mb-2">Error al Cargar Resultados</h4>
                        <p className="m-0">{errorMsg}</p>
                    </div>
                ) : metrics ? (
                    <>
                        {/* Título de la encuesta actual */}
                        <div className="mb-4 text-center text-md-start">
                            <h3 className="fw-bold text-dark mb-1">{surveyTitle}</h3>
                            <p className="text-muted m-0 fs-6">{surveyDesc}</p>
                        </div>

                        {/* 2. SECCIÓN: KPIs PÚBLICOS */}
                        <div className="row g-4 mb-4">
                            <div className="col-md-4">
                                <div className="card shadow-sm border-0 border-start border-purple border-3 p-3 h-100 bg-white" style={{ borderLeftColor: '#8b5cf6 !important' }}>
                                    <span className="text-muted small text-uppercase fw-semibold">Estudiantes Participantes</span>
                                    <h2 className="fw-bold mt-2 mb-0" style={{ color: '#1e1b4b' }}>{metrics.total}</h2>
                                    <span className="text-success small mt-1">✓ Muestra anónima representativa</span>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card shadow-sm border-0 border-start border-info border-3 p-3 h-100 bg-white">
                                    <span className="text-muted small text-uppercase fw-semibold">Edad Promedio</span>
                                    <h2 className="fw-bold mt-2 mb-0 text-info">{metrics.avgAge}</h2>
                                    <span className="text-muted small mt-1">Años de edad</span>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card shadow-sm border-0 border-start border-danger border-3 p-3 h-100 bg-white">
                                    <span className="text-muted small text-uppercase fw-semibold">Ratio de Ansiedad Crítica</span>
                                    <h2 className="fw-bold mt-2 mb-0 text-danger">{metrics.criticalAnxietyPercent}%</h2>
                                    <span className="text-muted small mt-1">Estudiantes con índice Moderado a Severo</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. SECCIÓN: GRÁFICOS ANALÍTICOS (SVG PREMIUM) */}
                        <div className="row g-4 mb-4">
                            
                            {/* Distribución de Ansiedad (GAD-7) */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm border-0 p-4 h-100 bg-white">
                                    <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2">Distribución Global de Ansiedad (GAD-7)</h4>
                                    
                                    {metrics.total === 0 ? (
                                        <div className="text-center py-5 text-muted small">No hay respuestas registradas aún.</div>
                                    ) : (
                                        <div className="row align-items-center h-100">
                                            <div className="col-sm-5 text-center mb-3 mb-sm-0">
                                                {/* Donut Chart SVG hecho a mano */}
                                                <svg width="150" height="150" viewBox="0 0 36 36" className="mx-auto">
                                                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="4.5" />
                                                    
                                                    {(() => {
                                                        const totals = 
                                                            metrics.gad7Dist["Ansiedad mínima"] +
                                                            metrics.gad7Dist["Ansiedad leve"] +
                                                            metrics.gad7Dist["Ansiedad moderada"] +
                                                            metrics.gad7Dist["Ansiedad severa"];
                                                        
                                                        if (totals === 0) return null;

                                                        let accum = 0;
                                                        const slices = [
                                                            { count: metrics.gad7Dist["Ansiedad mínima"], color: '#10b981' },
                                                            { count: metrics.gad7Dist["Ansiedad leve"], color: '#fbbf24' },
                                                            { count: metrics.gad7Dist["Ansiedad moderada"], color: '#f97316' },
                                                            { count: metrics.gad7Dist["Ansiedad severa"], color: '#ef4444' }
                                                        ];

                                                        return slices.map((slice, idx) => {
                                                            const percent = (slice.count / totals) * 100;
                                                            if (percent === 0) return null;
                                                            const strokeDash = `${percent} ${100 - percent}`;
                                                            const strokeOffset = 100 - accum + 25; // arriba
                                                            accum += percent;
                                                            return (
                                                                <circle 
                                                                    key={idx}
                                                                    cx="18" 
                                                                    cy="18" 
                                                                    r="15.915" 
                                                                    fill="none" 
                                                                    stroke={slice.color} 
                                                                    strokeWidth="4.8" 
                                                                    strokeDasharray={strokeDash}
                                                                    strokeDashoffset={strokeOffset}
                                                                />
                                                            );
                                                        });
                                                    })()}
                                                    
                                                    <circle cx="18" cy="18" r="11.5" fill="#fff" />
                                                    <text x="50%" y="48%" textAnchor="middle" dy=".3em" fontSize="4.5" fontWeight="bold" fill="#374151">Salud Mental</text>
                                                    <text x="50%" y="65%" textAnchor="middle" dy=".3em" fontSize="2.8" fill="#9ca3af">{metrics.total - metrics.gad7Dist["No determinado / N/A"]} estudiantes</text>
                                                </svg>
                                            </div>
                                            <div className="col-sm-7">
                                                <div className="d-flex flex-column space-y-2">
                                                    {Object.entries(metrics.gad7Dist)
                                                        .filter(([name]) => name !== "No determinado / N/A")
                                                        .map(([name, count]) => {
                                                            const totalEvaluated = metrics.total - metrics.gad7Dist["No determinado / N/A"];
                                                            const pct = totalEvaluated > 0 ? ((count / totalEvaluated) * 100).toFixed(1) : "0";
                                                            const style = getGAD7Styles(name);
                                                            return (
                                                                <div key={name} className="d-flex align-items-center justify-content-between mb-1.5 text-sm">
                                                                    <span className="text-muted">
                                                                        <span className="badge me-2" style={{ backgroundColor: style.color }}>&nbsp;</span>
                                                                        {name.replace("Ansiedad ", "")}
                                                                    </span>
                                                                    <span className="fw-semibold text-dark">{count} ({pct}%)</span>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Ranking de Carreras Participantes */}
                            <div className="col-lg-6">
                                <div className="card shadow-sm border-0 p-4 h-100 bg-white">
                                    <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2">Distribución por Carrera Académica (Top 5)</h4>
                                    
                                    {metrics.topCareers.length === 0 ? (
                                        <div className="text-center py-5 text-muted small">No hay suficientes datos demográficos cargados.</div>
                                    ) : (
                                        <div className="d-flex flex-column justify-content-center h-100">
                                            {metrics.topCareers.map((c, idx) => {
                                                const pct = ((c.count / metrics.total) * 100).toFixed(1);
                                                const barColors = ['bg-primary', 'bg-purple-700', 'bg-info', 'bg-warning', 'bg-success'];
                                                const activeColor = barColors[idx % barColors.length];
                                                
                                                return (
                                                    <div key={idx} className="mb-3">
                                                        <div className="d-flex justify-content-between align-items-center mb-1 text-sm">
                                                            <span className="fw-semibold text-gray-700 text-truncate" style={{ maxWidth: '280px' }}>{c.name}</span>
                                                            <span className="text-muted">{c.count} estudiantes ({pct}%)</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '7px', borderRadius: '4.5px' }}>
                                                            <div 
                                                                className={`progress-bar ${activeColor}`} 
                                                                role="progressbar" 
                                                                style={{ width: `${pct}%`, borderRadius: '4.5px' }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 4. SECCIÓN: DISTRIBUCIÓN POR CURSO Y LEYENDA */}
                        <div className="row g-4">
                            {/* Distribución por año académico */}
                            <div className="col-md-6">
                                <div className="card shadow-sm border-0 p-4 h-100 bg-white">
                                    <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2">Participación por Año de Carrera</h4>
                                    
                                    {metrics.yearDist.length === 0 ? (
                                        <div className="text-center py-5 text-muted small">No hay respuestas demográficas por año académico.</div>
                                    ) : (
                                        <div className="d-flex flex-column justify-content-center h-100">
                                            {metrics.yearDist.map((y, idx) => {
                                                const pct = ((y.count / metrics.total) * 100).toFixed(1);
                                                return (
                                                    <div key={idx} className="mb-3 text-sm">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <span className="fw-semibold text-gray-700">{y.name}</span>
                                                            <span className="text-muted">{y.count} estudiantes ({pct}%)</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                                                            <div 
                                                                className="progress-bar bg-secondary" 
                                                                role="progressbar" 
                                                                style={{ width: `${pct}%`, borderRadius: '3px', background: '#a78bfa' }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Leyenda y Explicativo Académico GAD-7 */}
                            <div className="col-md-6">
                                <div className="card shadow-sm border-0 p-4 h-100 text-white" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)' }}>
                                    <h4 className="fw-normal mb-3 border-bottom border-secondary pb-2">Sobre el Diagnóstico Escala GAD-7</h4>
                                    <p className="small text-white-50 leading-relaxed mb-3">
                                        La Escala **GAD-7 (Generalized Anxiety Disorder 7)** es una herramienta autoadministrada internacionalmente estandarizada que evalúa la frecuencia y severidad de los síntomas de ansiedad generalizada en las últimas dos semanas.
                                    </p>
                                    <div className="small text-white-50">
                                        <ul className="list-unstyled space-y-2 m-0">
                                            <li className="mb-1"><strong className="text-white">0 - 4 puntos:</strong> Sintomatología mínima o ausente de ansiedad.</li>
                                            <li className="mb-1"><strong className="text-white">5 - 9 puntos:</strong> Sintomatología leve. Se aconseja monitoreo autónomo.</li>
                                            <li className="mb-1"><strong className="text-white">10 - 14 puntos:</strong> Sintomatología moderada. Se recomienda orientación vocacional o consulta médica básica.</li>
                                            <li className="mb-1"><strong className="text-white">15 o más puntos:</strong> Sintomatología severa. Se aconseja buscar apoyo y consejería profesional.</li>
                                        </ul>
                                    </div>
                                    <div className="mt-4 pt-3 border-top border-secondary text-center">
                                        <span className="small text-white-50 italic">Los resultados expuestos son orientativos con fines de investigación académica y no constituyen un diagnóstico clínico profesional.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-5 bg-white rounded shadow-sm">
                        <p className="text-muted m-0">No se encontraron resultados en el portal para esta encuesta.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
