"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Question {
    id: string;
    titulo: string;
    seccion?: string;
    tipo: 'texto' | 'opcion_unica';
    opciones?: string[];
    requerida?: boolean;
}

interface SurveyData {
    id: string;
    titulo: string;
    descripcion: string;
    slug: string;
    preguntas: Question[];
}

const QuestionCard: React.FC<{ title: string; isRequired?: boolean; children: React.ReactNode }> = ({ title, isRequired = true, children }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 w-full transition duration-200 hover:shadow-md">
        <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-1">
            {title} {isRequired && <span className="text-red-500">*</span>}
        </h3>
        <div className="mt-4">
            {children}
        </div>
    </div>
);

const RadioGroup: React.FC<{
    name: string;
    options: string[];
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
}> = ({ name, options, value, onChange, disabled = false }) => (
    <div className="flex flex-col space-y-3">
        {options.map((opt, idx) => (
            <label key={idx} className={`flex items-center space-x-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input 
                    type="radio" 
                    name={name} 
                    value={opt} 
                    checked={value === opt}
                    onChange={() => onChange(opt)}
                    required
                    disabled={disabled}
                    className="w-5 h-5 accent-purple-700 border-gray-300 focus:ring-purple-500 transition duration-150"
                />
                <span className="text-gray-700 group-hover:text-purple-800 transition duration-150">{opt}</span>
            </label>
        ))}
    </div>
);

export default function DynamicSurvey() {
    const params = useParams();
    const slug = params?.slug as string || 'mente-cuerpo-y-aula';

    const [loading, setLoading] = useState(true);
    const [survey, setSurvey] = useState<SurveyData | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [serverResult, setServerResult] = useState<{ score: number | null; level: string | null }>({ score: null, level: null });

    // Estados de respuestas
    const [consentimiento, setConsentimiento] = useState("");
    const [edad, setEdad] = useState("");
    const [genero, setGenero] = useState("");
    const [carrera, setCarrera] = useState("");
    const [anio, setAnio] = useState("");
    const [respuestasPreguntas, setRespuestasPreguntas] = useState<Record<string, string>>({});

    // Cargar encuesta de la BD
    useEffect(() => {
        const fetchSurvey = async () => {
            try {
                const res = await fetch(`/api/survey?slug=${slug}`);
                const data = await res.json();
                
                if (!res.ok || !data.success) {
                    throw new Error(data.error || "No se pudo cargar la encuesta.");
                }
                
                setSurvey(data.survey);
                
                // Inicializar respuestas de preguntas
                const initialRespuestas: Record<string, string> = {};
                data.survey.preguntas.forEach((q: Question) => {
                    initialRespuestas[q.id] = "";
                });
                setRespuestasPreguntas(initialRespuestas);

            } catch (err: any) {
                console.error(err);
                setErrorMsg(err.message || "Error al conectar con el servidor.");
            } finally {
                setLoading(false);
            }
        };

        fetchSurvey();
    }, [slug]);

    const handleQuestionChange = (questionId: string, val: string) => {
        setRespuestasPreguntas(prev => ({ ...prev, [questionId]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        if (!survey) return;

        try {
            const response = await fetch('/api/survey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    encuestaId: survey.id,
                    consentimiento,
                    datosGenerales: {
                        edad,
                        genero,
                        carrera,
                        anio
                    },
                    respuestasPreguntas
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Error al procesar el envío de tus respuestas.");
            }

            setServerResult({
                score: data.score,
                level: data.level
            });
            setSubmitted(true);
            window.scrollTo(0, 0);

        } catch (error: any) {
            console.error("Error submitting dynamic survey:", error);
            setSubmitError(error.message || "Hubo un error de conexión con el servidor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setSubmitted(false);
        setSubmitError(null);
        setConsentimiento("");
        setEdad("");
        setGenero("");
        setCarrera("");
        setAnio("");
        if (survey) {
            const initialRespuestas: Record<string, string> = {};
            survey.preguntas.forEach((q: Question) => {
                initialRespuestas[q.id] = "";
            });
            setRespuestasPreguntas(initialRespuestas);
        }
        window.scrollTo(0, 0);
    };

    const getGAD7Styles = (level: string) => {
        if (level === "Ansiedad mínima") return { color: "text-green-600", bg: "bg-green-100" };
        if (level === "Ansiedad leve") return { color: "text-yellow-600", bg: "bg-yellow-100" };
        if (level === "Ansiedad moderada") return { color: "text-orange-600", bg: "bg-orange-100" };
        if (level === "Ansiedad severa") return { color: "text-red-600", bg: "bg-red-100" };
        return { color: "text-gray-600", bg: "bg-gray-100" };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f0ebf8] flex items-center justify-center font-sans">
                <div className="text-center p-8 bg-white rounded-lg shadow-md border border-gray-200">
                    <svg className="animate-spin h-10 w-10 text-purple-700 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600 font-medium">Cargando encuesta...</p>
                </div>
            </div>
        );
    }

    if (errorMsg || !survey) {
        return (
            <div className="min-h-screen bg-[#f0ebf8] py-10 px-4 flex items-center justify-center font-sans">
                <div className="w-full max-w-md bg-white border-t-8 border-red-600 rounded-lg shadow-md p-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Encuesta no disponible</h2>
                    <p className="text-gray-600 mb-6">{errorMsg || "La encuesta solicitada no existe o ha sido dada de baja."}</p>
                    <a href="/" className="inline-block bg-purple-700 hover:bg-purple-800 text-white font-medium py-2 px-6 rounded transition duration-200">Volver al inicio</a>
                </div>
            </div>
        );
    }

    if (submitted) {
        if (consentimiento === "No") {
            return (
                <div className="min-h-screen bg-[#f0ebf8] py-10 px-4 flex items-center justify-center font-sans">
                    <div className="w-full max-w-xl bg-white border-t-8 border-purple-700 rounded-lg shadow-md p-8 text-center">
                        <h1 className="text-3xl font-semibold text-gray-800 mb-4">Has decidido no participar</h1>
                        <p className="text-gray-600 mb-6 font-normal">Respetamos tu decisión. La información no ha sido recopilada ni guardada. ¡Muchas gracias por tu tiempo!</p>
                        <button onClick={handleReset} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded transition duration-200">Volver al inicio</button>
                    </div>
                </div>
            );
        }

        const isGad7Result = serverResult.score !== null && serverResult.level !== null;
        const gad7Styles = isGad7Result ? getGAD7Styles(serverResult.level!) : null;

        return (
            <div className="min-h-screen bg-[#f0ebf8] py-10 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white border-t-8 border-purple-700 rounded-lg shadow-md p-8 mb-6">
                        <h1 className="text-3xl font-semibold text-gray-800 mb-2">¡Gracias por participar!</h1>
                        <p className="text-gray-600">Tus respuestas han sido procesadas e ingresadas con éxito en la plataforma de investigación.</p>
                    </div>

                    {/* Si calculamos ansiedad */}
                    {isGad7Result && gad7Styles && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Resultado Escala GAD-7 (Ansiedad)</h2>
                            <div className={`p-4 rounded-md mb-4 ${gad7Styles.bg}`}>
                                <p className="text-lg text-gray-800">Tu puntaje es: <strong>{serverResult.score} / 21</strong></p>
                                <p className={`text-xl font-bold mt-1 ${gad7Styles.color}`}>Nivel indicado: {serverResult.level}</p>
                            </div>
                            <p className="text-sm text-gray-500 italic">*Nota: Este resultado es orientativo y no constituye un diagnóstico clínico. Si sientes que la ansiedad afecta tu bienestar, te recomendamos buscar apoyo profesional.</p>
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Resumen de Datos Generales</h2>
                        <ul className="space-y-2 text-gray-700">
                            <li><strong>Edad:</strong> {edad} años</li>
                            <li><strong>Género:</strong> {genero}</li>
                            <li><strong>Carrera:</strong> {carrera}</li>
                            <li><strong>Año académico:</strong> {anio}</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Detalle de tus Respuestas</h2>
                        
                        <div className="space-y-4">
                            {survey.preguntas.map((q) => {
                                const ans = respuestasPreguntas[q.id];
                                if (!ans) return null;
                                return (
                                    <div key={q.id} className="bg-gray-50 p-3 rounded border border-gray-100 text-sm">
                                        <div className="font-semibold text-gray-500 text-xs mb-1 uppercase tracking-wider">{q.seccion || "Pregunta"}</div>
                                        <div className="font-medium text-gray-800 mb-1">{q.titulo}</div>
                                        <div className="text-purple-700 font-semibold">{ans}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="text-center mt-8 pb-10">
                        <button onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded transition duration-200">Realizar nueva encuesta</button>
                    </div>
                </div>
            </div>
        );
    }

    // Agrupar preguntas por sección para una visualización premium
    const sections: Record<string, Question[]> = {};
    survey.preguntas.forEach((q) => {
        const sec = q.seccion || "Preguntas Generales";
        if (!sections[sec]) sections[sec] = [];
        sections[sec].push(q);
    });

    return (
        <div className="min-h-screen bg-[#f0ebf8] py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit}>
                    
                    {/* Header Section */}
                    <div className="bg-white border-t-8 border-purple-700 rounded-lg shadow-md p-6 sm:p-8 mb-4">
                        <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 mb-3">{survey.titulo}</h1>
                        <h2 className="text-lg text-gray-700 mb-4 font-medium">{survey.descripcion}</h2>
                        <hr className="mb-4 border-gray-200" />
                        <h3 className="font-bold text-gray-800 mb-2">CONSENTIMIENTO INFORMADO</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                            Esta encuesta tiene fines exclusivamente académicos y de investigación estudiantil. La información recopilada será anónima y confidencial. Los resultados no constituyen un diagnóstico médico ni psicológico. La participación es voluntaria.
                        </p>
                        <p className="text-red-500 text-sm font-medium">* Indica que la pregunta es obligatoria</p>
                    </div>

                    {/* Mensaje de Error */}
                    {submitError && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded shadow-sm text-sm text-red-700">
                            <p className="font-bold">Error al enviar formulario:</p>
                            <p>{submitError}</p>
                        </div>
                    )}

                    {/* Consentimiento */}
                    <QuestionCard title="¿Acepta participar en esta encuesta?">
                        <RadioGroup 
                            name="consentimiento" 
                            options={["Sí", "No"]} 
                            value={consentimiento}
                            onChange={setConsentimiento}
                            disabled={isSubmitting}
                        />
                    </QuestionCard>

                    {/* Condicional: Mostrar el resto del formulario si acepta participar */}
                    {consentimiento === "Sí" && (
                        <>
                            {/* Datos Generales */}
                            <div className="bg-purple-700 text-white p-3 rounded-t-lg mt-6 shadow-sm">
                                <h2 className="text-lg font-semibold ml-2">DATOS GENERALES</h2>
                            </div>
                            
                            <QuestionCard title="Edad">
                                <input 
                                    type="number" 
                                    name="edad" 
                                    value={edad} 
                                    onChange={(e) => setEdad(e.target.value)}
                                    required
                                    min="10"
                                    max="100"
                                    disabled={isSubmitting}
                                    placeholder="Tu respuesta"
                                    className="w-full sm:w-1/2 border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent disabled:opacity-50"
                                />
                            </QuestionCard>

                            <QuestionCard title="Género">
                                <RadioGroup 
                                    name="genero" 
                                    options={["Femenino", "Masculino", "No binario", "Prefiero no responder", "Otro"]} 
                                    value={genero}
                                    onChange={setGenero}
                                    disabled={isSubmitting}
                                />
                            </QuestionCard>

                            <QuestionCard title="Carrera">
                                <input 
                                    type="text" 
                                    name="carrera" 
                                    value={carrera} 
                                    onChange={(e) => setCarrera(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                    placeholder="Tu respuesta"
                                    className="w-full sm:w-2/3 border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent disabled:opacity-50"
                                />
                            </QuestionCard>

                            <QuestionCard title="Año académico">
                                <RadioGroup 
                                    name="anio" 
                                    options={["1° año", "2° año", "3° año", "4° año", "Otro"]} 
                                    value={anio}
                                    onChange={setAnio}
                                    disabled={isSubmitting}
                                />
                            </QuestionCard>

                            {/* Renderizar dinámicamente las secciones de preguntas */}
                            {Object.entries(sections).map(([sectionName, questions]) => (
                                <div key={sectionName} className="mt-8">
                                    <div className="bg-purple-700 text-white p-3 rounded-t-lg shadow-sm">
                                        <h2 className="text-lg font-semibold ml-2">{sectionName}</h2>
                                    </div>
                                    <div className="mb-4"></div>
                                    
                                    {questions.map((q) => (
                                        <QuestionCard key={q.id} title={q.titulo} isRequired={q.requerida}>
                                            {q.tipo === 'opcion_unica' && q.opciones ? (
                                                <RadioGroup 
                                                    name={q.id}
                                                    options={q.opciones}
                                                    value={respuestasPreguntas[q.id] || ""}
                                                    onChange={(val) => handleQuestionChange(q.id, val)}
                                                    disabled={isSubmitting}
                                                />
                                            ) : (
                                                <input 
                                                    type="text"
                                                    value={respuestasPreguntas[q.id] || ""}
                                                    onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                                                    required={q.requerida}
                                                    disabled={isSubmitting}
                                                    placeholder="Tu respuesta"
                                                    className="w-full border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent disabled:opacity-50"
                                                />
                                            )}
                                        </QuestionCard>
                                    ))}
                                </div>
                            ))}

                            <div className="flex justify-between items-center mt-8 mb-12">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className={`bg-purple-700 hover:bg-purple-800 text-white font-medium py-2.5 px-8 rounded shadow-md transition duration-200 flex items-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Guardando respuestas...
                                        </>
                                    ) : 'Enviar'}
                                </button>
                                <span className="text-xs text-gray-400 hidden sm:inline">Nunca envíes contraseñas a través de este formulario.</span>
                            </div>
                        </>
                    )}
                    
                    {/* Consentimiento es NO */}
                    {consentimiento === "No" && (
                        <div className="mt-6 mb-12 text-center sm:text-left">
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className={`bg-purple-700 hover:bg-purple-800 text-white font-medium py-2.5 px-8 rounded shadow-md transition duration-200 flex items-center justify-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Procesando...
                                    </>
                                ) : 'Finalizar y Enviar'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
