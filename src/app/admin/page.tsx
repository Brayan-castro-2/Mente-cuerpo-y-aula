"use client";

import React, { useState, useEffect } from 'react';

interface Question {
    id: string;
    titulo: string;
    seccion?: string;
    tipo: 'texto' | 'opcion_unica';
    opciones?: string[];
    requerida?: boolean;
}

interface Survey {
    id: string;
    titulo: string;
    descripcion: string;
    categoria: string;
    slug: string;
    activa: boolean;
    created_at: string;
    preguntas: Question[];
    total_respuestas: string;
}

interface ResponseItem {
    id: string;
    consentimiento: string;
    datos_generales: {
        edad: string;
        genero: string;
        carrera: string;
        anio: string;
    };
    respuestas_preguntas: Record<string, string>;
    gad7_score: number | null;
    gad7_level: string | null;
    created_at: string;
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

export default function AdminDashboard() {
    // Autenticación
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    // Datos generales
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState("");
    const [responses, setResponses] = useState<ResponseItem[]>([]);
    const [metrics, setMetrics] = useState<Metrics | null>(null);

    // Estados de Carga
    const [loadingSurveys, setLoadingSurveys] = useState(true);
    const [loadingResponses, setLoadingResponses] = useState(false);
    const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

    // Constructor de Encuestas
    const [showCreator, setShowCreator] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newSlug, setNewSlug] = useState("");
    const [newCategory, setNewCategory] = useState("Salud Mental y Bienestar");
    const [customCategory, setCustomCategory] = useState("");
    const [newQuestions, setNewQuestions] = useState<Question[]>([
        { id: "q_1", titulo: "¿Ejemplo de pregunta?", tipo: "opcion_unica", opciones: ["Sí", "No"], requerida: true }
    ]);

    // Pestañas principales de navegación
    const [activeTab, setActiveTab] = useState<'individual' | 'global'>('individual');

    // Filtros de respuestas
    const [filterCareer, setFilterCareer] = useState("TODAS");
    const [filterAnxiety, setFilterAnxiety] = useState("TODOS");
    const [filterYear, setFilterYear] = useState("TODOS");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal de Detalle
    const [activeResponse, setActiveResponse] = useState<ResponseItem | null>(null);

    // Recuperar credenciales del localStorage si existen
    useEffect(() => {
        const savedPass = localStorage.getItem("admin_session_password");
        if (savedPass) {
            handleLoginWithPassword(savedPass);
        } else {
            setLoadingSurveys(false);
        }
    }, []);

    const handleLoginWithPassword = async (passToVerify: string) => {
        setLoginError("");
        try {
            const res = await fetch('/api/admin/surveys', {
                headers: { 'Authorization': passToVerify }
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                setIsLoggedIn(true);
                localStorage.setItem("admin_session_password", passToVerify);
                setPassword(passToVerify);
                setSurveys(data.surveys);
                if (data.surveys.length > 0) {
                    setSelectedSurveyId(data.surveys[0].id);
                }
            } else {
                setLoginError(data.error || "Contraseña administrativa incorrecta.");
                localStorage.removeItem("admin_session_password");
            }
        } catch (err) {
            setLoginError("Error al conectar con la base de datos.");
        } finally {
            setLoadingSurveys(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        handleLoginWithPassword(password);
    };

    const handleLogout = () => {
        localStorage.removeItem("admin_session_password");
        setIsLoggedIn(false);
        setPassword("");
        setSurveys([]);
        setResponses([]);
        setMetrics(null);
        setActiveTab('individual');
    };

    // Cargar encuestas periódicamente o al cambiar de estado
    const refreshSurveys = async () => {
        try {
            const res = await fetch('/api/admin/surveys', {
                headers: { 'Authorization': password }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSurveys(data.surveys);
            }
        } catch (err) {
            console.error("Error refreshing surveys", err);
        }
    };

    // Cargar respuestas de la encuesta seleccionada
    useEffect(() => {
        if (!selectedSurveyId || !isLoggedIn) return;

        const fetchResponses = async () => {
            setLoadingResponses(true);
            try {
                const res = await fetch(`/api/admin/responses?surveyId=${selectedSurveyId}`, {
                    headers: { 'Authorization': password }
                });
                const data = await res.json();
                
                if (res.ok && data.success) {
                    setResponses(data.responses);
                    setMetrics(data.metrics);
                } else {
                    console.error("Error loading responses:", data.error);
                }
            } catch (err) {
                console.error("Connection error loading responses:", err);
            } finally {
                setLoadingResponses(false);
            }
        };

        fetchResponses();
        setFilterCareer("TODAS");
        setFilterAnxiety("TODOS");
        setFilterYear("TODOS");
        setSearchQuery("");
    }, [selectedSurveyId, isLoggedIn]);

    // Habilitar/Desactivar Encuesta
    const handleToggleSurvey = async (id: string, currentActive: boolean) => {
        try {
            const res = await fetch('/api/admin/surveys', {
                method: 'PATCH',
                headers: { 
                    'Authorization': password,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, activa: !currentActive })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("success", data.message);
                refreshSurveys();
            } else {
                showToast("danger", data.error);
            }
        } catch (err) {
            showToast("danger", "Error de comunicación.");
        }
    };

    // Eliminar Encuesta
    const handleDeleteSurvey = async (id: string) => {
        if (!confirm("¿Estás completamente seguro de eliminar esta encuesta? Esto borrará permanentemente la encuesta y todas las respuestas asociadas. Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            const res = await fetch('/api/admin/surveys', {
                method: 'PATCH',
                headers: {
                    'Authorization': password,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, action: 'delete' })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("success", data.message);
                refreshSurveys();
                if (selectedSurveyId === id) {
                    setSelectedSurveyId(surveys.find(s => s.id !== id)?.id || "");
                }
            } else {
                showToast("danger", data.error);
            }
        } catch (err) {
            showToast("danger", "Error al procesar la eliminación.");
        }
    };

    // Constructor de Preguntas
    const handleAddQuestion = () => {
        setNewQuestions(prev => [
            ...prev,
            { id: `q_${Date.now()}`, titulo: "", tipo: "opcion_unica", opciones: ["Sí", "No"], requerida: true }
        ]);
    };

    const handleRemoveQuestion = (idx: number) => {
        if (newQuestions.length === 1) return;
        setNewQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    const handleQuestionTextChange = (idx: number, text: string) => {
        setNewQuestions(prev => prev.map((q, i) => i === idx ? { ...q, titulo: text } : q));
    };

    const handleQuestionTypeChange = (idx: number, type: 'texto' | 'opcion_unica') => {
        setNewQuestions(prev => prev.map((q, i) => i === idx ? { 
            ...q, 
            tipo: type,
            opciones: type === 'opcion_unica' ? ["Sí", "No"] : undefined
        } : q));
    };

    const handleAddOption = (qIdx: number) => {
        setNewQuestions(prev => prev.map((q, i) => {
            if (i === qIdx && q.opciones) {
                return { ...q, opciones: [...q.opciones, `Opción ${q.opciones.length + 1}`] };
            }
            return q;
        }));
    };

    const handleRemoveOption = (qIdx: number, optIdx: number) => {
        setNewQuestions(prev => prev.map((q, i) => {
            if (i === qIdx && q.opciones) {
                return { ...q, opciones: q.opciones.filter((_, j) => j !== optIdx) };
            }
            return q;
        }));
    };

    const handleOptionTextChange = (qIdx: number, optIdx: number, text: string) => {
        setNewQuestions(prev => prev.map((q, i) => {
            if (i === qIdx && q.opciones) {
                const newOpts = [...q.opciones];
                newOpts[optIdx] = text;
                return { ...q, opciones: newOpts };
            }
            return q;
        }));
    };

    const handleStartEdit = (survey: Survey) => {
        setNewTitle(survey.titulo);
        setNewDesc(survey.descripcion || "");
        setNewSlug(survey.slug);
        setNewQuestions(survey.preguntas);
        
        // Categorizar adecuadamente
        const presets = ["Salud Mental y Bienestar", "Alimentación y Nutrición", "Rendimiento Académico", "General"];
        if (presets.includes((survey as any).categoria)) {
            setNewCategory((survey as any).categoria);
            setCustomCategory("");
        } else {
            setNewCategory("Personalizada...");
            setCustomCategory((survey as any).categoria || "");
        }

        setEditId(survey.id);
        setIsEditing(true);
        setShowCreator(true);
        window.scrollTo(0, 0);
    };

    const handleSaveNewSurvey = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validaciones básicas
        if (!newTitle.trim() || !newSlug.trim()) {
            showToast("danger", "Por favor completa el Título y Enlace de la encuesta.");
            return;
        }

        const emptyQuestion = newQuestions.some(q => !q.titulo.trim());
        if (emptyQuestion) {
            showToast("danger", "Por favor completa el texto de todas las preguntas.");
            return;
        }

        const finalCategory = newCategory === "Personalizada..." ? customCategory.trim() : newCategory;
        if (!finalCategory.trim()) {
            showToast("danger", "Por favor completa el nombre de la categoría personalizada.");
            return;
        }

        try {
            const url = '/api/admin/surveys';
            const method = isEditing ? 'PUT' : 'POST';
            const payload = isEditing 
                ? { id: editId, titulo: newTitle, descripcion: newDesc, categoria: finalCategory, slug: newSlug, preguntas: newQuestions }
                : { titulo: newTitle, descripcion: newDesc, categoria: finalCategory, slug: newSlug, preguntas: newQuestions };

            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': password,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast("success", data.message);
                refreshSurveys();
                
                if (isEditing) {
                    setSelectedSurveyId(editId);
                } else if (data.survey?.id) {
                    setSelectedSurveyId(data.survey.id);
                }

                // Resetear constructor
                setNewTitle("");
                setNewDesc("");
                setNewSlug("");
                setNewCategory("Salud Mental y Bienestar");
                setCustomCategory("");
                setNewQuestions([{ id: "q_1", titulo: "¿Ejemplo de pregunta?", tipo: "opcion_unica", opciones: ["Sí", "No"], requerida: true }]);
                setShowCreator(false);
                setIsEditing(false);
                setEditId("");
            } else {
                showToast("danger", data.error);
            }
        } catch (err) {
            showToast("danger", "Error de conexión al guardar la encuesta.");
        }
    };

    const showToast = (type: 'success' | 'danger', text: string) => {
        setActionMsg({ type, text });
        setTimeout(() => setActionMsg(null), 5000);
    };

    // Filtrar Respuestas
    const getFilteredResponses = () => {
        return responses.filter((r) => {
            const dg = r.datos_generales || {};
            
            const matchCareer = filterCareer === "TODAS" || dg.carrera === filterCareer;
            const matchAnxiety = filterAnxiety === "TODOS" || r.gad7_level === filterAnxiety;
            const matchYear = filterYear === "TODOS" || dg.anio === filterYear;
            
            const matchSearch = searchQuery.trim() === "" || 
                (dg.carrera && dg.carrera.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (dg.genero && dg.genero.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (r.gad7_level && r.gad7_level.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchCareer && matchAnxiety && matchYear && matchSearch;
        });
    };

    // Extraer carreras únicas para filtro
    const getUniqueCareers = () => {
        const careers = new Set<string>();
        responses.forEach(r => {
            if (r.datos_generales?.carrera) careers.add(r.datos_generales.carrera.trim());
        });
        return Array.from(careers);
    };

    // Exportar a CSV (Excel compatible con BOM para caracteres en español)
    const exportToCSV = () => {
        const activeData = getFilteredResponses();
        if (activeData.length === 0 || !selectedSurveyId) return;

        const currentSurvey = surveys.find(s => s.id === selectedSurveyId);
        if (!currentSurvey) return;

        // Cabeceras básicas + preguntas dinámicas
        const headers = ["ID de Respuesta", "Fecha de Envío", "Edad", "Género", "Carrera", "Año Académico", "Puntaje GAD-7", "Nivel de Ansiedad"];
        const questionHeaders = currentSurvey.preguntas.map(q => q.titulo.replace(/,/g, ' '));
        const allHeaders = [...headers, ...questionHeaders];

        // Filas de datos
        const rows = activeData.map(r => {
            const dg = r.datos_generales || {};
            const basicData = [
                r.id,
                new Date(r.created_at).toLocaleString('es-CL'),
                dg.edad,
                dg.genero,
                dg.carrera.replace(/,/g, ' '),
                dg.anio,
                r.gad7_score !== null ? r.gad7_score : "N/A",
                r.gad7_level !== null ? r.gad7_level : "N/A"
            ];
            
            const surveyAnswers = currentSurvey.preguntas.map(q => {
                const ans = r.respuestas_preguntas[q.id] || "";
                return ans.replace(/,/g, ' ').replace(/\n/g, ' ');
            });

            return [...basicData, ...surveyAnswers];
        });

        const csvContent = "\uFEFF" + [
            allHeaders.join(","),
            ...rows.map(e => e.map(val => `"${val}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `respuestas_${currentSurvey.slug}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const activeSurvey = surveys.find(s => s.id === selectedSurveyId);

    // RENDERIZAR LOGIN
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen d-flex align-items-center justify-content-center bg-dark" style={{ background: 'linear-gradient(135deg, #130a1c 0%, #050208 100%)' }}>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
                <div className="card border-0 shadow-lg p-4 text-white" style={{ maxWidth: '400px', width: '100%', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div className="text-center mb-4">
                        <div className="bg-purple text-purple-light p-3 d-inline-block rounded-circle mb-3" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                            <svg className="bi bi-shield-lock" width="36" height="36" fill="#a78bfa" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.338 1.59a61 61 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.6.6 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM8 0c.68 0 1.83.275 3.002.59 1.11.298 2.2.623 2.923.86a1.48 1.48 0 0 1 1.011 1.202c.621 4.664-.813 8.136-2.514 10.358a11.9 11.9 0 0 1-2.535 2.479c-.43.303-.847.534-1.22.71-.383.18-.737.307-1.077.307-.34 0-.694-.127-1.077-.307-.373-.176-.79-.407-1.22-.71a11.9 11.9 0 0 1-2.536-2.479C1.042 10.828-.392 7.356.229 2.692A1.48 1.48 0 0 1 1.24 1.49c.724-.237 1.812-.562 2.924-.86C5.337.275 6.486 0 8 0z"/>
                                <path d="M9.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-1 3c-1.11 0-2-.89-2-2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5c0 1.11-.89 2-2 2z"/>
                            </svg>
                        </div>
                        <h2 className="fw-normal">Investigación</h2>
                        <p className="text-white-50 small">Panel de Control Administrativo</p>
                    </div>

                    <form onSubmit={handleLogin}>
                        {loginError && <div className="alert alert-danger text-center py-2 text-sm">{loginError}</div>}
                        <div className="mb-3">
                            <label className="form-label text-white-50 small text-uppercase fw-semibold">Contraseña Administrativa</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                disabled={loadingSurveys}
                                className="form-control text-white bg-dark border-secondary focus:border-purple" 
                                placeholder="Ingresa contraseña" 
                                style={{ boxShadow: 'none' }}
                            />
                        </div>
                        <button type="submit" disabled={loadingSurveys} className="btn w-100 fw-bold py-2 mt-2" style={{ background: '#8b5cf6', color: '#fff', transition: '0.2s' }}>
                            {loadingSurveys ? "Autenticando..." : "Ingresar"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // RENDERIZAR DASHBOARD COMPLETO (BOOTSTRAP 5)
    const activeFiltered = getFilteredResponses();

    return (
        <div className="bg-light min-h-screen font-sans pb-5">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
            
            {/* Cabecera Administrativa */}
            <nav className="navbar navbar-dark bg-dark shadow-sm border-bottom border-secondary py-3 px-4">
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    <span className="navbar-brand mb-0 h1 fw-normal fs-4 d-flex align-items-center">
                        <span className="badge me-2" style={{ background: '#8b5cf6' }}>PRO</span> 
                        Plataforma de Investigación Estudiantil
                    </span>
                    <div className="d-flex align-items-center">
                        <a href="/visualizacion" target="_blank" className="btn btn-sm btn-outline-info me-2 px-3">Ver Portal Público</a>
                        <button onClick={() => setShowCreator(!showCreator)} className={`btn btn-sm ${showCreator ? 'btn-outline-warning' : 'btn-purple-light'} me-2`} style={showCreator ? {} : { background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
                            {showCreator ? "Cerrar Creador" : "Crear Nueva Encuesta"}
                        </button>
                        <button onClick={handleLogout} className="btn btn-sm btn-outline-danger px-3">Cerrar Sesión</button>
                    </div>
                </div>
            </nav>

            <div className="container mt-4">
                {actionMsg && (
                    <div className={`alert alert-${actionMsg.type} d-flex align-items-center justify-content-between shadow-sm p-3 mb-4`} role="alert">
                        <span>{actionMsg.text}</span>
                        <button onClick={() => setActionMsg(null)} className="btn-close" type="button"></button>
                    </div>
                )}

                {/* 1. SECCIÓN: CONSTRUCTOR DE ENCUESTAS DINÁMICAS */}
                {showCreator && (
                    <div className="card shadow-sm border-0 mb-4 p-4">
                        <h3 className="fw-normal text-purple-700 mb-3 border-bottom pb-2">
                            {isEditing ? 'Editar Encuesta Existente' : 'Constructor de Encuesta Dinámica'}
                        </h3>
                        <form onSubmit={handleSaveNewSurvey}>
                            <div className="row mb-3">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label fw-medium text-secondary">Título de la Encuesta</label>
                                    <input 
                                        type="text" 
                                        value={newTitle} 
                                        onChange={(e) => setNewTitle(e.target.value)} 
                                        required 
                                        className="form-control" 
                                        placeholder="Ej: Encuesta de Bienestar y Calidad Docente" 
                                    />
                                </div>
                                <div className="col-md-3 mb-2">
                                    <label className="form-label fw-medium text-secondary">Enlace único (Slug)</label>
                                    <input 
                                        type="text" 
                                        value={newSlug} 
                                        onChange={(e) => setNewSlug(e.target.value)} 
                                        required 
                                        className="form-control" 
                                        placeholder="Ej: bienestar-docente" 
                                    />
                                </div>
                                <div className="col-md-3 mb-2">
                                    <label className="form-label fw-medium text-secondary">Categoría</label>
                                    <select 
                                        value={newCategory} 
                                        onChange={(e) => setNewCategory(e.target.value)} 
                                        className="form-select"
                                    >
                                        <option value="Salud Mental y Bienestar">Salud Mental y Bienestar</option>
                                        <option value="Alimentación y Nutrición">Alimentación y Nutrición</option>
                                        <option value="Rendimiento Académico">Rendimiento Académico</option>
                                        <option value="General">General</option>
                                        <option value="Personalizada...">Personalizada...</option>
                                    </select>
                                </div>
                                {newCategory === "Personalizada..." ? (
                                    <div className="col-md-2 mb-2">
                                        <label className="form-label fw-medium text-secondary">Escribe Categoría</label>
                                        <input 
                                            type="text" 
                                            value={customCategory} 
                                            onChange={(e) => setCustomCategory(e.target.value)} 
                                            required 
                                            className="form-control" 
                                            placeholder="Ej: Salud Dental" 
                                        />
                                    </div>
                                ) : (
                                    <div className="col-md-2 mb-2 d-flex align-items-end">
                                        <span className="text-muted small mb-2 d-block">URL: <code>/{newSlug || 'enlace'}</code></span>
                                    </div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="form-label fw-medium text-secondary">Descripción / Consentimiento Detallado</label>
                                <textarea 
                                    rows={2} 
                                    value={newDesc} 
                                    onChange={(e) => setNewDesc(e.target.value)} 
                                    className="form-control" 
                                    placeholder="Instrucciones breves para los estudiantes..."
                                />
                            </div>

                            <h4 className="fw-normal border-bottom pb-2 mb-3 text-secondary">Preguntas del Formulario</h4>
                            
                            {newQuestions.map((q, qIdx) => (
                                <div key={q.id} className="p-3 bg-light rounded border border-gray-200 mb-3">
                                    <div className="row align-items-center">
                                        <div className="col-md-6 mb-2">
                                            <label className="form-label small text-secondary">Texto de la Pregunta</label>
                                            <input 
                                                type="text" 
                                                value={q.titulo} 
                                                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)} 
                                                required 
                                                className="form-control form-control-sm" 
                                                placeholder="Escribe la pregunta aquí..." 
                                            />
                                        </div>
                                        <div className="col-md-3 mb-2">
                                            <label className="form-label small text-secondary">Tipo de Respuesta</label>
                                            <select 
                                                value={q.tipo} 
                                                onChange={(e) => handleQuestionTypeChange(qIdx, e.target.value as any)} 
                                                className="form-select form-select-sm"
                                            >
                                                <option value="opcion_unica">Opción Única (Radios)</option>
                                                <option value="texto">Texto Libre</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3 mb-2 d-flex align-items-end justify-content-end">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveQuestion(qIdx)} 
                                                disabled={newQuestions.length === 1}
                                                className="btn btn-sm btn-outline-danger px-3 mt-4"
                                            >
                                                Eliminar Pregunta
                                            </button>
                                        </div>
                                    </div>

                                    {/* Si es opción única, dejar añadir opciones */}
                                    {q.tipo === 'opcion_unica' && q.opciones && (
                                        <div className="mt-3 ps-4 border-start border-purple" style={{ borderLeftWidth: '3px' }}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="small fw-semibold text-secondary">Opciones de Respuesta</span>
                                                <button type="button" onClick={() => handleAddOption(qIdx)} className="btn btn-xs btn-outline-purple py-0 px-2 small" style={{ fontSize: '0.75rem', borderColor: '#8b5cf6', color: '#8b5cf6' }}>+ Agregar Opción</button>
                                            </div>
                                            {q.opciones.map((opt, optIdx) => (
                                                <div key={optIdx} className="d-flex align-items-center mb-1">
                                                    <input 
                                                        type="text" 
                                                        value={opt} 
                                                        onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)} 
                                                        required 
                                                        className="form-control form-control-sm me-2 py-0" 
                                                        style={{ maxWidth: '300px', fontSize: '0.85rem' }} 
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveOption(qIdx, optIdx)} 
                                                        disabled={q.opciones!.length <= 2}
                                                        className="btn btn-xs btn-link text-danger py-0 px-1"
                                                        style={{ fontSize: '0.8rem' }}
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div className="d-flex justify-content-between mt-4">
                                <button type="button" onClick={handleAddQuestion} className="btn btn-sm btn-outline-purple" style={{ color: '#8b5cf6', borderColor: '#8b5cf6' }}>+ Añadir Otra Pregunta</button>
                                <div className="d-flex">
                                    <button type="button" onClick={() => { setShowCreator(false); setIsEditing(false); }} className="btn btn-sm btn-outline-secondary me-2">Cancelar</button>
                                    <button type="submit" className="btn btn-sm text-white" style={{ background: '#8b5cf6' }}>
                                        {isEditing ? 'Guardar Cambios de la Encuesta' : 'Activar Encuesta en la Web'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Selector de Pestañas de Análisis */}
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <ul className="nav nav-pills bg-white p-1 rounded shadow-sm border" style={{ borderRadius: '8px' }}>
                        <li className="nav-item">
                            <button 
                                type="button"
                                onClick={() => setActiveTab('individual')} 
                                className={`nav-link border-0 px-4 py-2 fw-medium ${activeTab === 'individual' ? 'active text-white' : 'text-secondary bg-transparent'}`}
                                style={activeTab === 'individual' ? { backgroundColor: '#8b5cf6', borderRadius: '6px' } : { borderRadius: '6px' }}
                            >
                                <svg className="bi bi-graph-up me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M0 0h1v15h15v1H0V0Zm14.817 3.113a.5.5 0 0 1 .07.704l-4.5 5.5a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61 4.15-5.073a.5.5 0 0 1 .704-.07Z"/>
                                </svg>
                                Análisis por Encuesta
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                type="button"
                                onClick={() => setActiveTab('global')} 
                                className={`nav-link border-0 px-4 py-2 fw-medium ${activeTab === 'global' ? 'active text-white' : 'text-secondary bg-transparent'}`}
                                style={activeTab === 'global' ? { backgroundColor: '#8b5cf6', borderRadius: '6px' } : { borderRadius: '6px' }}
                            >
                                <svg className="bi bi-grid-fill me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h-3A1.5 1.5 0 0 1 1 10.5v3A1.5 1.5 0 0 1 2.5 15h3A1.5 1.5 0 0 1 7 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
                                </svg>
                                Síntesis Global de la Plataforma
                            </button>
                        </li>
                    </ul>
                    {activeTab === 'global' && (
                        <span className="badge rounded-pill text-white px-3 py-2 fw-semibold shadow-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
                            Consolidado Institucional
                        </span>
                    )}
                </div>

                {/* --- VISTA INDIVIDUAL POR ENCUESTA --- */}
                {activeTab === 'individual' && (
                    <>
                        {/* 2. SECCIÓN: CONTROL Y LISTADO DE ENCUESTAS */}
                        <div className="card shadow-sm border-0 mb-4 p-4">
                            <div className="row align-items-center">
                                <div className="col-md-5">
                                    <label className="form-label fw-bold text-secondary text-uppercase small m-0 mb-2">Encuesta Seleccionada para Análisis</label>
                                    <select 
                                        value={selectedSurveyId} 
                                        onChange={(e) => setSelectedSurveyId(e.target.value)} 
                                        className="form-select py-2 fw-medium border-purple"
                                        style={{ borderColor: 'rgba(139, 92, 246, 0.4)' }}
                                    >
                                        {surveys.map(s => (
                                            <option key={s.id} value={s.id}>{s.titulo} ({s.total_respuestas} respuestas)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-7 d-flex justify-content-md-end flex-wrap gap-2 mt-3 mt-md-0">
                                    {activeSurvey && (
                                        <>
                                            <a href={activeSurvey.slug === 'mente-cuerpo-y-aula' ? '/' : `/survey/${activeSurvey.slug}`} target="_blank" className="btn btn-sm btn-outline-secondary px-3 py-2">
                                                Abrir Formulario Estudiante
                                            </a>
                                            <button 
                                                onClick={() => handleStartEdit(activeSurvey)} 
                                                className="btn btn-sm text-white px-3 py-2" 
                                                style={{ background: '#8b5cf6' }}
                                            >
                                                <svg className="bi bi-pencil-square me-1" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
                                                    <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
                                                </svg>
                                                Editar Cuestionario
                                            </button>
                                            <button 
                                                onClick={() => handleToggleSurvey(activeSurvey.id, activeSurvey.activa)} 
                                                className={`btn btn-sm ${activeSurvey.activa ? 'btn-outline-warning' : 'btn-success'} px-3 py-2`}
                                            >
                                                {activeSurvey.activa ? "Desactivar Encuesta" : "Activar Encuesta"}
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteSurvey(activeSurvey.id)} 
                                                disabled={surveys.length === 1}
                                                className="btn btn-sm btn-outline-danger px-3 py-2"
                                            >
                                                Eliminar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 2.5 SECCIÓN: COMPARTIR Y MASIFICAR (CÓDIGO QR Y REDES) */}
                        {activeSurvey && (
                            <div className="card shadow-sm border-0 mb-4 p-4 bg-white" style={{ borderLeft: '5px solid #8b5cf6' }}>
                                <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2 d-flex align-items-center">
                                    <svg className="bi bi-share me-2" width="20" height="20" fill="#8b5cf6" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                                    </svg>
                                    Masificar y Compartir Encuesta
                                </h4>
                                {(() => {
                                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                    const surveyUrl = origin + (activeSurvey.slug === 'mente-cuerpo-y-aula' ? '/' : `/survey/${activeSurvey.slug}`);
                                    
                                    const downloadQR = async () => {
                                        try {
                                            const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(surveyUrl)}`);
                                            const blob = await response.blob();
                                            const blobUrl = URL.createObjectURL(blob);
                                            const link = document.createElement("a");
                                            link.href = blobUrl;
                                            link.download = `qr_${activeSurvey.slug}.png`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(blobUrl);
                                            showToast("success", "Código QR descargado exitosamente.");
                                        } catch (err) {
                                            showToast("danger", "Error al descargar el código QR.");
                                        }
                                    };

                                    const copyLink = () => {
                                        navigator.clipboard.writeText(surveyUrl);
                                        showToast("success", "¡Enlace copiado al portapapeles con éxito!");
                                    };

                                    const shareWhatsApp = () => {
                                        const text = `Hola, te invito a responder la encuesta oficial de investigación "${activeSurvey.titulo}" ingresando aquí: ${surveyUrl}`;
                                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                                    };

                                    const shareEmail = () => {
                                        const subject = `Invitación: Encuesta de Investigación "${activeSurvey.titulo}"`;
                                        const body = `Hola,\n\nTe invito cordialmente a participar respondiendo la encuesta oficial "${activeSurvey.titulo}" en el siguiente enlace:\n\n${surveyUrl}\n\nTu participación es sumamente valiosa para nuestro estudio.\n\nAtentamente,\nEquipo de Investigación`;
                                        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                                    };

                                    return (
                                        <div className="row align-items-center g-4">
                                            {/* Sección QR */}
                                            <div className="col-md-3 text-center border-md-end border-gray-200">
                                                <div className="p-2 border bg-light rounded d-inline-block shadow-xs mb-2">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(surveyUrl)}`} 
                                                        alt="Código QR de la encuesta"
                                                        className="img-fluid"
                                                        style={{ width: '150px', height: '150px', display: 'block' }}
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={downloadQR} 
                                                    className="btn btn-sm btn-outline-purple d-block w-100 mt-1"
                                                    style={{ color: '#8b5cf6', borderColor: '#8b5cf6' }}
                                                >
                                                    <svg className="bi bi-download me-1" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                                        <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                                    </svg>
                                                    Descargar QR (PNG HD)
                                                </button>
                                            </div>
                                            
                                            {/* Sección Compartido */}
                                            <div className="col-md-9">
                                                <p className="text-muted mb-2">
                                                    Utiliza los siguientes canales para difundir masivamente la encuesta entre la comunidad estudiantil. La encuesta se adapta automáticamente a cualquier dispositivo móvil.
                                                </p>
                                                
                                                <div className="input-group mb-3">
                                                    <span className="input-group-text bg-light text-secondary small fw-medium">Enlace Oficial</span>
                                                    <input 
                                                        type="text" 
                                                        readOnly 
                                                        value={surveyUrl} 
                                                        className="form-control bg-white font-monospace text-sm" 
                                                        style={{ fontSize: '0.85rem' }}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={copyLink} 
                                                        className="btn btn-outline-secondary px-3"
                                                        title="Copiar Enlace"
                                                    >
                                                        Copiar Link
                                                    </button>
                                                </div>

                                                <div className="d-flex flex-wrap gap-2">
                                                    <button 
                                                        type="button" 
                                                        onClick={shareWhatsApp} 
                                                        className="btn btn-sm btn-success px-3 py-2 d-flex align-items-center"
                                                        style={{ backgroundColor: '#25d366', borderColor: '#25d366' }}
                                                    >
                                                        <svg className="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.949h.004c4.368 0 7.926-3.558 7.93-7.93a7.896 7.896 0 0 0-2.333-5.593l.002-.008zm-5.607 11.8a6.598 6.598 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.69-4.982c-.193-.097-1.14-.563-1.317-.627-.176-.065-.306-.097-.436.097-.13.195-.5.627-.614.757-.115.13-.23.147-.424.05-.193-.097-.813-.3-1.548-.957-.573-.513-.96-1.148-1.072-1.343-.113-.195-.012-.3.086-.398.088-.088.194-.227.29-.341.1-.114.133-.193.199-.325.066-.133.033-.25-.017-.35-.05-.1-.436-1.05-.597-1.428-.157-.375-.328-.324-.436-.324-.112-.003-.242-.003-.374-.003-.13 0-.342.049-.52.247-.18.196-.68.665-.68 1.623 0 .958.697 1.882.795 2.012.098.13 1.37 2.094 3.32 2.936.464.2.825.32 1.107.41.467.148.89.127 1.226.077.375-.055 1.14-.467 1.3-.918.16-.452.338-.853.338-1.012 0-.16-.05-.303-.243-.398z"/>
                                                        </svg>
                                                        Compartir por WhatsApp
                                                    </button>
                                                    
                                                    <button 
                                                        type="button" 
                                                        onClick={shareEmail} 
                                                        className="btn btn-sm btn-outline-dark px-3 py-2 d-flex align-items-center"
                                                    >
                                                        <svg className="bi bi-envelope me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                                                        </svg>
                                                        Enviar por Correo
                                                    </button>

                                                    <a 
                                                        href={surveyUrl} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="btn btn-sm btn-link text-purple px-2 text-decoration-none d-flex align-items-center"
                                                        style={{ color: '#8b5cf6' }}
                                                    >
                                                        Probar Vista Estudiante →
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* KPIs y Tablas individuales */}
                        {metrics ? (
                            <>
                                {/* 3. SECCIÓN: TARJETAS DE MÉTRICAS (KPIs) */}
                                <div className="row g-4 mb-4">
                                    <div className="col-md-3 col-sm-6">
                                        <div className="card shadow-sm border-0 border-start border-purple border-3 p-3 h-100 bg-white" style={{ borderLeftColor: '#8b5cf6 !important' }}>
                                            <span className="text-muted small text-uppercase fw-semibold">Respuestas Recibidas</span>
                                            <h2 className="fw-bold mt-2 mb-0" style={{ color: '#1e1b4b' }}>{metrics.total}</h2>
                                            <span className="text-success small mt-1">100% consentidas</span>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-sm-6">
                                        <div className="card shadow-sm border-0 border-start border-info border-3 p-3 h-100 bg-white">
                                            <span className="text-muted small text-uppercase fw-semibold">Edad Promedio</span>
                                            <h2 className="fw-bold mt-2 mb-0 text-info">{metrics.avgAge}</h2>
                                            <span className="text-muted small mt-1">años académicos</span>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-sm-6">
                                        <div className="card shadow-sm border-0 border-start border-danger border-3 p-3 h-100 bg-white">
                                            <span className="text-muted small text-uppercase fw-semibold">Ansiedad Crítica</span>
                                            <h2 className="fw-bold mt-2 mb-0 text-danger">{metrics.criticalAnxietyPercent}%</h2>
                                            <span className="text-muted small mt-1">Nivel Moderada o Severa</span>
                                        </div>
                                    </div>
                                    <div className="col-md-3 col-sm-6">
                                        <div className="card shadow-sm border-0 border-start border-warning border-3 p-3 h-100 bg-white">
                                            <span className="text-muted small text-uppercase fw-semibold">Carrera Frecuente</span>
                                            <h5 className="fw-bold mt-2 mb-0 text-warning text-truncate" style={{ fontSize: '1.15rem' }}>
                                                {metrics.topCareers[0]?.name || "Sin datos"}
                                            </h5>
                                            <span className="text-muted small mt-1">{metrics.topCareers[0]?.count || 0} estudiantes</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. SECCIÓN: ANALÍTICAS VISUALES (GRÁFICOS SVG PREMIUM) */}
                                <div className="row g-4 mb-4">
                                    {/* Gráfico SVG de Ansiedad GAD-7 */}
                                    <div className="col-lg-6">
                                        <div className="card shadow-sm border-0 p-4 h-100 bg-white">
                                            <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2">Análisis de Ansiedad (Escala GAD-7)</h4>
                                            
                                            {metrics.total === 0 ? (
                                                <div className="text-center py-5 text-muted small">No hay respuestas registradas para esta encuesta.</div>
                                            ) : (
                                                <div className="row align-items-center h-100">
                                                    <div className="col-sm-5 text-center mb-3 mb-sm-0">
                                                        <svg width="160" height="160" viewBox="0 0 36 36" className="mx-auto">
                                                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                                                            
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
                                                                    const strokeOffset = 100 - accum + 25; // 25 de desfase para iniciar arriba
                                                                    accum += percent;
                                                                    return (
                                                                        <circle 
                                                                            key={idx}
                                                                            cx="18" 
                                                                            cy="18" 
                                                                            r="15.915" 
                                                                            fill="none" 
                                                                            stroke={slice.color} 
                                                                            strokeWidth="4.2" 
                                                                            strokeDasharray={strokeDash}
                                                                            strokeDashoffset={strokeOffset}
                                                                        />
                                                                    );
                                                                });
                                                            })()}
                                                            
                                                            <circle cx="18" cy="18" r="12" fill="#fff" />
                                                            <text x="50%" y="48%" textAnchor="middle" dy=".3em" fontSize="5" fontWeight="bold" fill="#374151">GAD-7</text>
                                                            <text x="50%" y="65%" textAnchor="middle" dy=".3em" fontSize="3" fill="#9ca3af">{metrics.total - metrics.gad7Dist["No determinado / N/A"]} evaluados</text>
                                                        </svg>
                                                    </div>
                                                    <div className="col-sm-7">
                                                        <div className="d-flex flex-column space-y-2">
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <span className="small text-muted"><span className="badge me-2" style={{ backgroundColor: '#10b981' }}>&nbsp;</span>Mínima</span>
                                                                <span className="small fw-semibold">{metrics.gad7Dist["Ansiedad mínima"]} estudiantes</span>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <span className="small text-muted"><span className="badge me-2" style={{ backgroundColor: '#fbbf24' }}>&nbsp;</span>Leve</span>
                                                                <span className="small fw-semibold">{metrics.gad7Dist["Ansiedad leve"]} estudiantes</span>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <span className="small text-muted"><span className="badge me-2" style={{ backgroundColor: '#f97316' }}>&nbsp;</span>Moderada</span>
                                                                <span className="small fw-semibold">{metrics.gad7Dist["Ansiedad moderada"]} estudiantes</span>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <span className="small text-muted"><span className="badge me-2" style={{ backgroundColor: '#ef4444' }}>&nbsp;</span>Severa</span>
                                                                <span className="small fw-semibold">{metrics.gad7Dist["Ansiedad severa"]} estudiantes</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Carreras con mayor participación */}
                                    <div className="col-lg-6">
                                        <div className="card shadow-sm border-0 p-4 h-100 bg-white">
                                            <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2">Carreras con Mayor Participación</h4>
                                            
                                            {metrics.topCareers.length === 0 ? (
                                                <div className="text-center py-5 text-muted small">No hay respuestas demográficas registradas.</div>
                                            ) : (
                                                <div className="d-flex flex-column justify-content-center h-100">
                                                    {metrics.topCareers.map((c, idx) => {
                                                        const pct = ((c.count / metrics.total) * 100).toFixed(1);
                                                        const barColors = ['bg-primary', 'bg-purple-700', 'bg-info', 'bg-warning', 'bg-success'];
                                                        const activeColor = barColors[idx % barColors.length];
                                                        
                                                        return (
                                                            <div key={idx} className="mb-3">
                                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                                    <span className="small fw-semibold text-gray-700 text-truncate" style={{ maxWidth: '280px' }}>{c.name}</span>
                                                                    <span className="small text-muted">{c.count} encuestas ({pct}%)</span>
                                                                </div>
                                                                <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                                                                    <div 
                                                                        className={`progress-bar ${activeColor}`} 
                                                                        role="progressbar" 
                                                                        style={{ width: `${pct}%`, borderRadius: '4px' }}
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

                                {/* 5. SECCIÓN: TABLA INTERACTIVA DE RESPUESTAS */}
                                <div className="card shadow-sm border-0 p-4 bg-white">
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center border-bottom pb-3 mb-3">
                                        <h3 className="fw-normal text-secondary m-0 mb-3 mb-md-0">Detalle de Respuestas Recibidas</h3>
                                        <button onClick={exportToCSV} disabled={activeFiltered.length === 0} className="btn btn-sm btn-success px-4 fw-bold">
                                            Exportar a Excel (CSV)
                                        </button>
                                    </div>

                                    {/* Barra de Filtros y Búsqueda */}
                                    <div className="row g-2 mb-4">
                                        <div className="col-md-3">
                                            <label className="form-label small text-muted text-uppercase">Búsqueda Rápida</label>
                                            <input 
                                                type="text" 
                                                value={searchQuery} 
                                                onChange={(e) => setSearchQuery(e.target.value)} 
                                                placeholder="Buscar por carrera, nivel..." 
                                                className="form-control form-control-sm"
                                            />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small text-muted text-uppercase">Filtro por Carrera</label>
                                            <select 
                                                value={filterCareer} 
                                                onChange={(e) => setFilterCareer(e.target.value)} 
                                                className="form-select form-select-sm"
                                            >
                                                <option value="TODAS">Todas las carreras</option>
                                                {getUniqueCareers().map((c, i) => (
                                                    <option key={i} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small text-muted text-uppercase">Filtro por Ansiedad</label>
                                            <select 
                                                value={filterAnxiety} 
                                                onChange={(e) => setFilterAnxiety(e.target.value)} 
                                                className="form-select form-select-sm"
                                            >
                                                <option value="TODOS">Todos los niveles</option>
                                                <option value="Ansiedad mínima">Ansiedad Mínima</option>
                                                <option value="Ansiedad leve">Ansiedad Leve</option>
                                                <option value="Ansiedad moderada">Ansiedad Moderada</option>
                                                <option value="Ansiedad severa">Ansiedad Severa</option>
                                                <option value="No determinado / N/A">No Determinado / N/A</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small text-muted text-uppercase">Filtro por Año</label>
                                            <select 
                                                value={filterYear} 
                                                onChange={(e) => setFilterYear(e.target.value)} 
                                                className="form-select form-select-sm"
                                            >
                                                <option value="TODOS">Todos los años</option>
                                                <option value="1° año">1° año</option>
                                                <option value="2° año">2° año</option>
                                                <option value="3° año">3° año</option>
                                                <option value="4° año">4° año</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Listado Principal */}
                                    {activeFiltered.length === 0 ? (
                                        <div className="text-center py-5 text-muted bg-light rounded border border-gray-150">
                                            No se encontraron respuestas para los filtros seleccionados.
                                        </div>
                                    ) : (
                                        <div className="table-responsive text-sm">
                                            <table className="table table-hover align-middle border-top border-gray-200">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th scope="col" style={{ width: '100px' }}>Fecha</th>
                                                        <th scope="col" style={{ width: '60px' }}>Edad</th>
                                                        <th scope="col" style={{ width: '90px' }}>Género</th>
                                                        <th scope="col">Carrera</th>
                                                        <th scope="col" style={{ width: '90px' }}>Año</th>
                                                        <th scope="col" style={{ width: '80px' }} className="text-center">GAD-7</th>
                                                        <th scope="col" style={{ width: '150px' }}>Severidad</th>
                                                        <th scope="col" style={{ width: '80px' }} className="text-center">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activeFiltered.map((row) => {
                                                        const dg = row.datos_generales || {};
                                                        
                                                        let badgeClass = "bg-secondary-subtle text-secondary";
                                                        if (row.gad7_level === "Ansiedad mínima") badgeClass = "bg-success-subtle text-success";
                                                        else if (row.gad7_level === "Ansiedad leve") badgeClass = "bg-warning-subtle text-warning";
                                                        else if (row.gad7_level === "Ansiedad moderada") badgeClass = "bg-warning text-dark";
                                                        else if (row.gad7_level === "Ansiedad severa") badgeClass = "bg-danger-subtle text-danger";

                                                        return (
                                                            <tr key={row.id}>
                                                                <td>{new Date(row.created_at).toLocaleDateString('es-CL')}</td>
                                                                <td>{dg.edad}</td>
                                                                <td>{dg.genero}</td>
                                                                <td className="text-truncate" style={{ maxWidth: '200px' }}>{dg.carrera}</td>
                                                                <td>{dg.anio}</td>
                                                                <td className="text-center fw-bold">{row.gad7_score !== null ? row.gad7_score : "-"}</td>
                                                                <td>
                                                                    <span className={`badge ${badgeClass} border px-2.5 py-1.5`} style={row.gad7_level === "Ansiedad moderada" ? { backgroundColor: '#ffedd5', color: '#ea580c', borderColor: '#fed7aa' } : {}}>
                                                                        {row.gad7_level || "No determinado"}
                                                                    </span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => setActiveResponse(row)} 
                                                                        className="btn btn-xs btn-outline-purple py-0.5 px-2"
                                                                        style={{ fontSize: '0.8rem', color: '#8b5cf6', borderColor: '#8b5cf6' }}
                                                                    >
                                                                        Ver
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            <div className="small text-muted mt-2">
                                                Mostrando {activeFiltered.length} de {responses.length} registros cargados.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-5 bg-white rounded shadow-sm">
                                <p className="text-muted m-0">No se encontraron datos para la encuesta seleccionada.</p>
                            </div>
                        )}
                    </>
                )}

                {/* --- VISTA SÍNTESIS GLOBAL --- */}
                {activeTab === 'global' && (
                    <div className="fade-in">
                        {(() => {
                            const totalSurveys = surveys.length;
                            const totalResponses = surveys.reduce((acc, s) => acc + parseInt(s.total_respuestas || '0'), 0);
                            const activeSurveysCount = surveys.filter(s => s.activa).length;
                            
                            // Agrupar por categoría
                            const categoryStats = surveys.reduce((acc, s) => {
                                const cat = s.categoria || 'General';
                                if (!acc[cat]) {
                                    acc[cat] = { surveysCount: 0, responsesCount: 0 };
                                }
                                acc[cat].surveysCount += 1;
                                acc[cat].responsesCount += parseInt(s.total_respuestas || '0');
                                return acc;
                            }, {} as Record<string, { surveysCount: number, responsesCount: number }>);
                            
                            // Encontrar categoría líder
                            let leaderCategory = "Ninguna";
                            let maxResponses = -1;
                            Object.entries(categoryStats).forEach(([cat, data]) => {
                                if (data.responsesCount > maxResponses) {
                                    maxResponses = data.responsesCount;
                                    leaderCategory = cat;
                                }
                            });

                            return (
                                <>
                                    {/* 1. KPIs Globales */}
                                    <div className="row g-4 mb-4">
                                        <div className="col-md-3 col-sm-6">
                                            <div className="card shadow-sm border-0 border-start border-purple border-3 p-3 h-100 bg-white" style={{ borderLeftColor: '#8b5cf6 !important' }}>
                                                <span className="text-muted small text-uppercase fw-semibold">Total Cuestionarios</span>
                                                <h2 className="fw-bold mt-2 mb-0" style={{ color: '#1e1b4b' }}>{totalSurveys}</h2>
                                                <span className="text-purple small mt-1">✓ Catálogo institucional</span>
                                            </div>
                                        </div>
                                        <div className="col-md-3 col-sm-6">
                                            <div className="card shadow-sm border-0 border-start border-success border-3 p-3 h-100 bg-white">
                                                <span className="text-muted small text-uppercase fw-semibold">Respuestas Totales</span>
                                                <h2 className="fw-bold mt-2 mb-0 text-success">{totalResponses}</h2>
                                                <span className="text-muted small mt-1">Envíos consolidados</span>
                                            </div>
                                        </div>
                                        <div className="col-md-3 col-sm-6">
                                            <div className="card shadow-sm border-0 border-start border-info border-3 p-3 h-100 bg-white">
                                                <span className="text-muted small text-uppercase fw-semibold">Encuestas Activas</span>
                                                <h2 className="fw-bold mt-2 mb-0 text-info">{activeSurveysCount}</h2>
                                                <span className="text-muted small mt-1">Recibiendo respuestas</span>
                                            </div>
                                        </div>
                                        <div className="col-md-3 col-sm-6">
                                            <div className="card shadow-sm border-0 border-start border-warning border-3 p-3 h-100 bg-white">
                                                <span className="text-muted small text-uppercase fw-semibold">Líder en Participación</span>
                                                <h5 className="fw-bold mt-2 mb-0 text-warning text-truncate" style={{ fontSize: '1.15rem' }}>
                                                    {leaderCategory}
                                                </h5>
                                                <span className="text-muted small mt-1">{maxResponses} respuestas acumuladas</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Distribución y Gráficos por Categoría */}
                                    <div className="row g-4 mb-4">
                                        {/* Proporción de Encuestas por Categoría */}
                                        <div className="col-lg-6">
                                            <div className="card shadow-sm border-0 p-4 h-100 bg-white">
                                                <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2">Distribución Temática (Por Categorías)</h4>
                                                {totalSurveys === 0 ? (
                                                    <div className="text-center py-5 text-muted small">No hay encuestas en el catálogo.</div>
                                                ) : (
                                                    <div className="d-flex flex-column justify-content-center h-100">
                                                        {Object.entries(categoryStats).map(([catName, data], idx) => {
                                                            const pctSurveys = ((data.surveysCount / totalSurveys) * 100).toFixed(1);
                                                            const barColors = ['bg-primary', 'bg-purple-700', 'bg-info', 'bg-warning', 'bg-success'];
                                                            const activeColor = barColors[idx % barColors.length];
                                                            
                                                            return (
                                                                <div key={catName} className="mb-3">
                                                                    <div className="d-flex justify-content-between align-items-center mb-1 text-sm">
                                                                        <span className="fw-semibold text-gray-700">{catName}</span>
                                                                        <span className="text-muted">{data.surveysCount} cuestionario(s) ({pctSurveys}%)</span>
                                                                    </div>
                                                                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                                                                        <div 
                                                                            className={`progress-bar ${activeColor}`} 
                                                                            role="progressbar" 
                                                                            style={{ width: `${pctSurveys}%`, borderRadius: '4px' }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Respuestas por Categoría */}
                                        <div className="col-lg-6">
                                            <div className="card shadow-sm border-0 p-4 h-100 bg-white">
                                                <h4 className="fw-normal text-secondary mb-3 border-bottom pb-2">Respuestas Acumuladas por Categoría</h4>
                                                {totalResponses === 0 ? (
                                                    <div className="text-center py-5 text-muted small">No se han registrado respuestas en la plataforma aún.</div>
                                                ) : (
                                                    <div className="d-flex flex-column justify-content-center h-100">
                                                        {Object.entries(categoryStats).map(([catName, data], idx) => {
                                                            const pctResponses = ((data.responsesCount / totalResponses) * 100).toFixed(1);
                                                            const barColors = ['bg-success', 'bg-warning', 'bg-info', 'bg-primary', 'bg-purple-700'];
                                                            const activeColor = barColors[idx % barColors.length];
                                                            
                                                            return (
                                                                <div key={catName} className="mb-3">
                                                                    <div className="d-flex justify-content-between align-items-center mb-1 text-sm">
                                                                        <span className="fw-semibold text-gray-700">{catName}</span>
                                                                        <span className="text-muted">{data.responsesCount} respuestas ({pctResponses}%)</span>
                                                                    </div>
                                                                    <div className="progress" style={{ height: '8px', borderRadius: '4px' }}>
                                                                        <div 
                                                                            className={`progress-bar ${activeColor}`} 
                                                                            role="progressbar" 
                                                                            style={{ width: `${pctResponses}%`, borderRadius: '4px' }}
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

                                    {/* 3. Tabla Completa de Encuestas del Catálogo */}
                                    <div className="card shadow-sm border-0 p-4 bg-white">
                                        <div className="border-bottom pb-3 mb-3">
                                            <h3 className="fw-normal text-secondary m-0">Catálogo Completo de Encuestas</h3>
                                        </div>

                                        <div className="table-responsive text-sm">
                                            <table className="table table-hover align-middle border-top border-gray-200">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th scope="col">Título</th>
                                                        <th scope="col" style={{ width: '220px' }}>Categoría</th>
                                                        <th scope="col" style={{ width: '120px' }}>Creada el</th>
                                                        <th scope="col" style={{ width: '120px' }} className="text-center">Estado</th>
                                                        <th scope="col" style={{ width: '150px' }} className="text-center">Respuestas</th>
                                                        <th scope="col" style={{ width: '150px' }} className="text-center">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {surveys.map((survey) => {
                                                        const createdDate = new Date(survey.created_at).toLocaleDateString('es-CL');
                                                        
                                                        let badgeBg = "rgba(139, 92, 246, 0.1)";
                                                        let badgeColor = "#6d28d9";
                                                        if (survey.categoria === "Alimentación y Nutrición") {
                                                            badgeBg = "rgba(16, 185, 129, 0.1)";
                                                            badgeColor = "#047857";
                                                        } else if (survey.categoria === "Rendimiento Académico") {
                                                            badgeBg = "rgba(14, 165, 233, 0.1)";
                                                            badgeColor = "#0369a1";
                                                        } else if (survey.categoria === "General") {
                                                            badgeBg = "rgba(107, 114, 128, 0.1)";
                                                            badgeColor = "#374151";
                                                        }

                                                        return (
                                                            <tr key={survey.id}>
                                                                <td className="fw-semibold text-dark">{survey.titulo}</td>
                                                                <td>
                                                                    <span className="badge px-3 py-1.5 border" style={{ backgroundColor: badgeBg, color: badgeColor, borderColor: 'transparent', borderRadius: '4px' }}>
                                                                        {survey.categoria || "General"}
                                                                    </span>
                                                                </td>
                                                                <td>{createdDate}</td>
                                                                <td className="text-center">
                                                                    <span className={`badge px-2.5 py-1.5 ${survey.activa ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`}>
                                                                        {survey.activa ? "Activa" : "Inactiva"}
                                                                    </span>
                                                                </td>
                                                                <td className="text-center fw-bold">{survey.total_respuestas}</td>
                                                                <td className="text-center">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedSurveyId(survey.id);
                                                                            setActiveTab('individual');
                                                                        }} 
                                                                        className="btn btn-sm text-white py-1 px-3"
                                                                        style={{ fontSize: '0.8rem', backgroundColor: '#8b5cf6' }}
                                                                    >
                                                                        Ver Análisis
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* 6. MODAL INTERACTIVO DE DETALLE (Overlay React + Bootstrap Style) */}
            {activeResponse && activeSurvey && (
                <div 
                    className="modal d-block show" 
                    tabIndex={-1} 
                    style={{ background: 'rgba(0, 0, 0, 0.5)', overflowY: 'auto' }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-dark text-white py-3">
                                <h5 className="modal-title fw-normal">Detalle de Respuestas del Estudiante</h5>
                                <button type="button" onClick={() => setActiveResponse(null)} className="btn-close btn-close-white" aria-label="Close"></button>
                            </div>
                            
                            <div className="modal-body p-4 text-sm" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {/* Datos demográficos */}
                                <div className="bg-light p-3 rounded mb-4 border">
                                    <h6 className="fw-bold text-secondary text-uppercase small mb-3 border-bottom pb-1">Datos Generales</h6>
                                    <div className="row g-3">
                                        <div className="col-6 col-sm-3">
                                            <span className="text-muted d-block small">Edad:</span>
                                            <strong className="text-dark">{activeResponse.datos_generales?.edad} años</strong>
                                        </div>
                                        <div className="col-6 col-sm-3">
                                            <span className="text-muted d-block small">Género:</span>
                                            <strong className="text-dark">{activeResponse.datos_generales?.genero}</strong>
                                        </div>
                                        <div className="col-12 col-sm-4">
                                            <span className="text-muted d-block small">Carrera:</span>
                                            <strong className="text-dark text-wrap">{activeResponse.datos_generales?.carrera}</strong>
                                        </div>
                                        <div className="col-6 col-sm-2">
                                            <span className="text-muted d-block small">Año Académico:</span>
                                            <strong className="text-dark">{activeResponse.datos_generales?.anio}</strong>
                                        </div>
                                    </div>
                                    {activeResponse.gad7_score !== null && (
                                        <div className="row mt-3 pt-3 border-top align-items-center">
                                            <div className="col-sm-6">
                                                <span className="text-muted d-block small">Escala de Ansiedad (GAD-7):</span>
                                                <strong className="text-purple" style={{ color: '#8b5cf6' }}>{activeResponse.gad7_score} / 21 puntos</strong>
                                            </div>
                                            <div className="col-sm-6">
                                                <span className="text-muted d-block small">Nivel Interpretado:</span>
                                                <strong className="text-dark">{activeResponse.gad7_level}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Preguntas dinámicas respondidas */}
                                <h6 className="fw-bold text-secondary text-uppercase small mb-3 border-bottom pb-1">Cuestionario Respondido</h6>
                                <div className="space-y-3">
                                    {activeSurvey.preguntas.map((q, idx) => {
                                        const answer = activeResponse.respuestas_preguntas[q.id] || "Sin respuesta";
                                        return (
                                            <div key={q.id} className="p-2 border-bottom border-gray-100">
                                                <div className="d-flex align-items-start">
                                                    <span className="badge bg-secondary-subtle text-secondary me-2 mt-0.5" style={{ fontSize: '0.7rem' }}>{idx + 1}</span>
                                                    <div>
                                                        <p className="m-0 fw-medium text-dark">{q.titulo}</p>
                                                        <p className="m-0 mt-1 fw-bold text-purple" style={{ color: '#8b5cf6' }}>{answer}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className="modal-footer bg-light py-2">
                                <button type="button" onClick={() => setActiveResponse(null)} className="btn btn-sm btn-secondary px-4">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
