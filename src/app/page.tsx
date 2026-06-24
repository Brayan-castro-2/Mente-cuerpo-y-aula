"use client";

import React, { useState, useEffect } from 'react';

interface Question {
    id: string;
    titulo: string;
    seccion?: string;
    tipo: 'texto' | 'opcion_unica' | 'opcion_multiple';
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
        {options.map((opt, idx) => {
            // Mostrar los puntos si coincide con la escala GAD-7 clásica
            let labelText = opt;
            if (opt === "Nunca") labelText = "0 - Nunca";
            else if (opt === "Varios días") labelText = "1 - Varios días";
            else if (opt === "Más de la mitad de los días") labelText = "2 - Más de la mitad de los días";
            else if (opt === "Casi todos los días") labelText = "3 - Casi todos los días";

            return (
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
                    <span className="text-gray-700 group-hover:text-purple-800 transition duration-150">{labelText}</span>
                </label>
            );
        })}
    </div>
);

const CheckboxGroup: React.FC<{
    name: string;
    options: string[];
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    required?: boolean;
}> = ({ name, options, value, onChange, disabled = false, required = false }) => {
    const selectedOptions = value ? value.split(', ') : [];

    const handleCheckboxChange = (opt: string, checked: boolean) => {
        let newSelected: string[];
        if (checked) {
            if (opt === "Ninguno") {
                newSelected = ["Ninguno"];
            } else {
                newSelected = selectedOptions.filter(x => x !== "Ninguno");
                if (!newSelected.includes(opt)) {
                    newSelected.push(opt);
                }
            }
        } else {
            newSelected = selectedOptions.filter(x => x !== opt);
        }
        
        const orderedSelected = options.filter(x => newSelected.includes(x));
        onChange(orderedSelected.join(', '));
    };

    return (
        <div className="flex flex-col space-y-3">
            {options.map((opt, idx) => {
                const isChecked = selectedOptions.includes(opt);
                return (
                    <label key={idx} className={`flex items-center space-x-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input 
                            type="checkbox" 
                            name={name} 
                            value={opt} 
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(opt, e.target.checked)}
                            disabled={disabled}
                            required={required && selectedOptions.length === 0}
                            className="w-5 h-5 rounded text-purple-700 accent-purple-700 border-gray-300 focus:ring-purple-500 transition duration-150"
                        />
                        <span className="text-gray-700 group-hover:text-purple-800 transition duration-150">{opt}</span>
                    </label>
                );
            })}
        </div>
    );
};

export default function HomeSurvey() {
    const slug = 'mente-cuerpo-y-aula'; // Encuesta flagship por defecto

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
    const [situacionLaboral, setSituacionLaboral] = useState("");
    const [comentarios, setComentarios] = useState("");
    const [titulado, setTitulado] = useState("No");
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
    }, []);

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
                        anio: titulado === "Sí" ? "" : anio,
                        situacionLaboral,
                        titulado
                    },
                    respuestasPreguntas: {
                        ...respuestasPreguntas,
                        comentarios_adicionales: comentarios
                    }
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
            console.error("Error submitting survey:", error);
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
        setSituacionLaboral("");
        setComentarios("");
        setTitulado("No");
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
                <div className="w-full max-w-xl bg-white border-t-8 border-red-600 rounded-lg shadow-md p-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Encuesta no disponible</h2>
                    <p className="text-gray-600 mb-6">{errorMsg || "La encuesta solicitada no existe o ha sido dada de baja."}</p>
                    <button onClick={() => window.location.reload()} className="bg-purple-700 hover:bg-purple-800 text-white font-medium py-2 px-6 rounded transition duration-200">Reintentar</button>
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
                            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                                <svg className="w-6 h-6 text-purple-700 me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Evaluación Oficial Escala GAD-7 (Ansiedad Generalizada)
                            </h2>
                            
                            <div className="flex flex-col md:flex-row gap-6 items-center mb-6">
                                <div className="w-full md:w-5/12 text-center md:border-r md:border-gray-200 md:pr-6 py-2">
                                    <div className="inline-block p-4 rounded-full bg-purple-50 mb-2">
                                        <span className="text-4xl font-black text-purple-700">{serverResult.score}</span>
                                        <span className="text-gray-400 text-lg"> / 21</span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-lg mb-1">{serverResult.level}</h4>
                                    <span className="text-xs text-gray-400 block">Escala clínica validada científicamente</span>
                                </div>
                                <div className="w-full md:w-7/12">
                                    <h5 className="font-bold text-gray-700 text-xs mb-2 uppercase tracking-wider">Sistema de Calificación Original:</h5>
                                    <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                                        <div className={`flex justify-between p-1.5 px-3 rounded ${serverResult.score! <= 4 ? 'bg-green-100 font-semibold text-green-800 border border-green-200' : 'bg-gray-50'}`}>
                                            <span>0 - 4 puntos:</span> <span>Ansiedad Mínima</span>
                                        </div>
                                        <div className={`flex justify-between p-1.5 px-3 rounded ${serverResult.score! >= 5 && serverResult.score! <= 9 ? 'bg-yellow-100 font-semibold text-yellow-800 border border-yellow-200' : 'bg-gray-50'}`}>
                                            <span>5 - 9 puntos:</span> <span>Ansiedad Leve</span>
                                        </div>
                                        <div className={`flex justify-between p-1.5 px-3 rounded ${serverResult.score! >= 10 && serverResult.score! <= 14 ? 'bg-orange-100 font-semibold text-orange-800 border border-orange-200' : 'bg-gray-50'}`}>
                                            <span>10 - 14 puntos:</span> <span>Ansiedad Moderada</span>
                                        </div>
                                        <div className={`flex justify-between p-1.5 px-3 rounded ${serverResult.score! >= 15 ? 'bg-red-100 font-semibold text-red-800 border border-red-200' : 'bg-gray-50'}`}>
                                            <span>15 - 21 puntos:</span> <span>Ansiedad Severa</span>
                                        </div>
                                    </div>
                                    
                                    {/* Barra visual de rango */}
                                    <div className="w-full bg-gray-100 rounded-full h-3.5 mb-2 overflow-hidden flex">
                                        <div className="h-full bg-green-500" style={{ width: '23.8%' }}></div>
                                        <div className="h-full bg-yellow-400" style={{ width: '23.8%' }}></div>
                                        <div className="h-full bg-orange-500" style={{ width: '23.8%' }}></div>
                                        <div className="h-full bg-red-500" style={{ width: '28.6%' }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 px-1 font-mono">
                                        <span>0</span>
                                        <span>5</span>
                                        <span>10</span>
                                        <span>15</span>
                                        <span>21</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recomendación Clínica */}
                            <div className="p-4 rounded-lg bg-purple-50/50 border border-purple-100">
                                <h4 className="font-bold text-purple-900 text-sm mb-2 flex items-center">
                                    <svg className="w-4 h-4 text-purple-700 me-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Recomendación y Consejos del Estudio:
                                </h4>
                                <p className="text-gray-700 text-sm leading-relaxed m-0">
                                    {(() => {
                                        const score = serverResult.score!;
                                        if (score <= 4) {
                                            return "Sintomatología mínima o ausente de ansiedad. Continúa aplicando tus hábitos cotidianos de autocuidado, alimentación sana, recreación activa y descanso equilibrado para salvaguardar tu bienestar general.";
                                        } else if (score <= 9) {
                                            return "Sintomatología leve de ansiedad detectada. Te aconsejamos practicar ejercicios regulares de relajación, respiración consciente, meditación o actividad física moderada. Considera reevaluar tu estado en unas semanas y mantén hábitos sanos de sueño.";
                                        } else if (score <= 14) {
                                            return "Sintomatología moderada de ansiedad detectada. Te recomendamos conversar sobre esto con personas de tu confianza y acudir al departamento de bienestar estudiantil o consejería psicológica de tu campus para recibir orientación vocacional, técnicas de manejo de estrés académico y soporte preventivo.";
                                        } else {
                                            return "Sintomatología severa de ansiedad detectada. Te sugerimos firmemente priorizar tu salud y acudir de manera proactiva a una consulta con un profesional del área médica o psicológica (terapeuta) para recibir un acompañamiento clínico completo, seguro y especializado. Tu bienestar es lo más importante.";
                                        }
                                    })()}
                                </p>
                            </div>
                            
                            <div className="mt-3 text-center">
                                <span className="text-[11px] text-gray-400 italic">Este resultado es un indicador orientativo derivado de tus respuestas al test autoaplicado y no constituye bajo ningún caso una evaluación diagnóstica ni reemplaza la consulta psicológica o médica profesional.</span>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Resumen de Datos Generales</h2>
                        <ul className="space-y-2 text-gray-700">
                            <li><strong>Edad:</strong> {edad} años</li>
                            <li><strong>Género:</strong> {genero}</li>
                            <li><strong>¿Se encuentra titulado/a?:</strong> {titulado}</li>
                            <li><strong>Escuela:</strong> {carrera}</li>
                            {titulado === "No" && <li><strong>Año académico:</strong> {anio ? (anio.includes('año') ? anio : `${anio}° año`) : ""}</li>}
                            <li><strong>Situación Ocupacional:</strong> {situacionLaboral}</li>
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
                            {comentarios && (
                                <div className="bg-purple-50/50 p-3 rounded border border-purple-100 text-sm">
                                    <div className="font-semibold text-purple-700 text-xs mb-1 uppercase tracking-wider">Comentarios o Sugerencias Adicionales</div>
                                    <div className="text-purple-900 font-semibold">{comentarios}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center mt-8 pb-10">
                        <button onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded transition duration-200">Realizar nueva encuesta</button>
                    </div>
                </div>
            </div>
        );
    }

    // Agrupar preguntas por sección
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
                        
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-4 text-sm text-gray-700 leading-relaxed">
                            Esta encuesta forma parte del proyecto de título de la estudiante <strong>Gabriela Lemarie Guerrero</strong>. El estudio tiene como objetivo recopilar datos académicos sobre la relación entre la ansiedad estudiantil, la alimentación y el bienestar general, aplicando la escala <strong>GAD-7</strong> para identificar la frecuencia de síntomas asociados al estrés académico en la educación superior.
                        </div>

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

                            <QuestionCard title="Escuela">
                                <select 
                                    name="carrera" 
                                    value={carrera} 
                                    onChange={(e) => setCarrera(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                    className="w-full sm:w-2/3 border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent disabled:opacity-50"
                                >
                                    <option value="" disabled>Seleccione su escuela</option>
                                    <option value="Escuela de Salud">Escuela de Salud</option>
                                    <option value="Escuela de Telecomunicaciones">Escuela de Telecomunicaciones</option>
                                    <option value="Escuela de Informática">Escuela de Informática</option>
                                    <option value="Escuela de Administración y Negocios">Escuela de Administración y Negocios</option>
                                    <option value="Escuela de Ingeniería">Escuela de Ingeniería</option>
                                    <option value="Escuela de Construcción">Escuela de Construcción</option>
                                    <option value="Escuela de Diseño">Escuela de Diseño</option>
                                    <option value="Escuela de Gastronomía">Escuela de Gastronomía</option>
                                    <option value="Escuela de Recursos Naturales">Escuela de Recursos Naturales</option>
                                    <option value="Escuela de Turismo">Escuela de Turismo</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </QuestionCard>

                            <QuestionCard title="¿Se encuentra titulado/a?">
                                <RadioGroup 
                                    name="titulado" 
                                    options={["No", "Sí"]} 
                                    value={titulado}
                                    onChange={setTitulado}
                                    disabled={isSubmitting}
                                />
                            </QuestionCard>

                            {titulado === "No" && (
                                <QuestionCard title="Año académico">
                                    <input 
                                        type="number" 
                                        name="anio" 
                                        value={anio} 
                                        onChange={(e) => setAnio(e.target.value)}
                                        required={titulado === "No"}
                                        min="1"
                                        max="10"
                                        disabled={isSubmitting}
                                        placeholder="Tu respuesta (ej: 1, 2, 3...)"
                                        className="w-full sm:w-1/2 border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent disabled:opacity-50"
                                    />
                                </QuestionCard>
                            )}

                            <QuestionCard title="Situación Ocupacional">
                                <RadioGroup 
                                    name="situacionLaboral" 
                                    options={["Solo estudia", "Estudia y trabaja", "Solo trabaja"]} 
                                    value={situacionLaboral}
                                    onChange={setSituacionLaboral}
                                    disabled={isSubmitting}
                                />
                            </QuestionCard>

                            {/* Renderizar dinámicamente las secciones de preguntas */}
                            {Object.entries(sections).map(([sectionName, questions]) => (
                                <div key={sectionName} className="mt-8">
                                    <div className="bg-purple-700 text-white p-3 rounded-t-lg shadow-sm">
                                        <h2 className="text-lg font-semibold ml-2">{sectionName}</h2>
                                    </div>
                                    {sectionName.toUpperCase().includes("GAD-7") && (
                                        <div className="bg-white rounded-b-lg shadow-sm border-x border-b border-gray-200 p-5 mb-4 text-sm text-gray-600 leading-relaxed">
                                            La escala <strong>GAD-7</strong> (Cuestionario de Ansiedad Generalizada) es una herramienta de tamizaje clínicamente validada que mide la frecuencia y severidad de los síntomas de ansiedad durante las últimas 2 semanas. Por favor, responda a las siguientes preguntas indicando la opción que mejor represente su situación.
                                        </div>
                                    )}
                                    {sectionName.toUpperCase().includes("ALIMENTACIÓN") && (
                                        <div className="bg-white rounded-b-lg shadow-sm border-x border-b border-gray-200 p-5 mb-4 text-sm text-gray-600 leading-relaxed">
                                            Esta sección analiza la relación entre los niveles de estrés o ansiedad de origen académico y sus conductas alimentarias, de sueño y energía cotidiana.
                                        </div>
                                    )}
                                    {sectionName.toUpperCase().includes("PERCEPCIÓN") && (
                                        <div className="bg-white rounded-b-lg shadow-sm border-x border-b border-gray-200 p-5 mb-4 text-sm text-gray-600 leading-relaxed">
                                            Las siguientes preguntas recopilan su opinión sobre el impacto de los trastornos alimentarios y la importancia de contar con apoyo institucional en salud mental.
                                        </div>
                                    )}
                                    
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
                                            ) : q.tipo === 'opcion_multiple' && q.opciones ? (
                                                <CheckboxGroup 
                                                    name={q.id}
                                                    options={q.opciones}
                                                    value={respuestasPreguntas[q.id] || ""}
                                                    onChange={(val) => handleQuestionChange(q.id, val)}
                                                    disabled={isSubmitting}
                                                    required={q.requerida}
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

                            {/* Sección opcional de comentarios al final de todo el formulario */}
                            <div className="mt-8">
                                <QuestionCard title="¿Deseas agregar algún comentario o sugerencia adicional?" isRequired={false}>
                                    <textarea
                                        name="comentarios_adicionales"
                                        value={comentarios}
                                        onChange={(e) => setComentarios(e.target.value)}
                                        maxLength={2000}
                                        placeholder="Si tienes alguna duda, sugerencia o comentario sobre la encuesta, escríbelo aquí..."
                                        rows={4}
                                        disabled={isSubmitting}
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-purple-600 transition duration-200 text-gray-800 bg-transparent disabled:opacity-50"
                                    />
                                    <div className="text-right text-xs text-gray-400 mt-1">
                                        {comentarios.length} / 2000 caracteres
                                    </div>
                                </QuestionCard>
                            </div>

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
