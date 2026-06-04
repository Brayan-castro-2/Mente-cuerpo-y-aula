import React, { useState } from 'react';

const GAD7_OPTIONS = ["Nunca", "Varios días", "Más de la mitad de los días", "Casi todos los días"];
const GAD7_QUESTIONS = [
    "1. Sentirse nervioso/a, ansioso/a o muy alterado/a.",
    "2. No poder dejar de preocuparse o controlar las preocupaciones.",
    "3. Preocuparse demasiado por diferentes situaciones.",
    "4. Tener dificultad para relajarse.",
    "5. Sentirse tan inquieto/a que es difícil quedarse quieto/a.",
    "6. Irritarse o molestarse fácilmente.",
    "7. Sentir miedo como si algo terrible pudiera pasar."
];

const RELACION_OPTIONS = ["Nunca", "Rara vez", "A veces", "Frecuentemente", "Muy frecuentemente"];
const RELACION_QUESTIONS = [
    "1. ¿Has sentido que comes grandes cantidades de comida en poco tiempo, acompañado de una sensación de pérdida de control?",
    "2. ¿Has presentado molestias físicas (dolor estomacal, náuseas, falta de apetito o malestar digestivo) en períodos de estrés, ansiedad o preocupación académica?",
    "3. ¿Te has sentido preocupado/a por tu peso o apariencia física al punto de afectar tu bienestar emocional?",
    "4. ¿Has cambiado tus hábitos alimentarios durante períodos de estrés académico?",
    "5. ¿Has tenido dificultades para dormir debido a preocupaciones académicas o personales?",
    "6. ¿Sientes que la ansiedad ha afectado tu rendimiento académico o concentración?"
];

const PERCEPCION_OPTIONS = ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"];
const PERCEPCION_QUESTIONS = [
    "1. ¿Consideras que trastornos como la anorexia, bulimia o el trastorno por atracón afectan significativamente la salud mental y la vida académica de una persona?",
    "2. ¿Crees que existe suficiente información y apoyo sobre salud mental en el entorno estudiantil?",
    "3. ¿Consideras importante hablar sobre salud mental y alimentación en instituciones educativas?"
];

const QuestionCard = ({ title, description, children, isRequired = true }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4 w-full transition duration-200 hover:shadow-md">
        <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-1">
            {title} {isRequired && <span className="text-red-500">*</span>}
        </h3>
        {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
        <div className="mt-4">
            {children}
        </div>
    </div>
);

const RadioGroup = ({ name, options, vertical = true, formData, handleChange }) => (
    <div className={`flex ${vertical ? 'flex-col space-y-3' : 'flex-col sm:flex-row sm:space-x-6 sm:space-y-0 space-y-3'}`}>
        {options.map((opt, idx) => (
            <label key={idx} className="flex items-center space-x-3 cursor-pointer group">
                <input 
                    type="radio" 
                    name={name} 
                    value={opt} 
                    checked={formData[name] === opt}
                    onChange={handleChange}
                    required
                    className="w-5 h-5 accent-purple-700 border-gray-300 focus:ring-purple-500 transition duration-150"
                />
                <span className="text-gray-700 group-hover:text-purple-800 transition duration-150">{opt}</span>
            </label>
        ))}
    </div>
);

export default function App() {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        consentimiento: "",
        edad: "",
        genero: "",
        carrera: "",
        anio: "",
        situacionLaboral: "",
        comentarios: "",
        titulado: "No",
        // GAD-7
        ...Object.fromEntries(GAD7_QUESTIONS.map((_, i) => [`gad7_${i}`, ""])),
        // Relación
        ...Object.fromEntries(RELACION_QUESTIONS.map((_, i) => [`relacion_${i}`, ""])),
        // Percepción
        ...Object.fromEntries(PERCEPCION_QUESTIONS.map((_, i) => [`percepcion_${i}`, ""])),
        // Apoyo
        apoyo1: "",
        apoyo2: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        window.scrollTo(0, 0);
    };

    const calculateGAD7Score = () => {
        let score = 0;
        GAD7_QUESTIONS.forEach((_, i) => {
            const ans = formData[`gad7_${i}`];
            if (ans === "Varios días") score += 1;
            if (ans === "Más de la mitad de los días") score += 2;
            if (ans === "Casi todos los días") score += 3;
        });
        return score;
    };

    const getGAD7Interpretation = (score) => {
        if (score >= 0 && score <= 4) return { level: "Ansiedad mínima", color: "text-green-600", bg: "bg-green-100" };
        if (score >= 5 && score <= 9) return { level: "Ansiedad leve", color: "text-yellow-600", bg: "bg-yellow-100" };
        if (score >= 10 && score <= 14) return { level: "Ansiedad moderada", color: "text-orange-600", bg: "bg-orange-100" };
        if (score >= 15) return { level: "Ansiedad severa", color: "text-red-600", bg: "bg-red-100" };
        return { level: "No determinado", color: "text-gray-600", bg: "bg-gray-100" };
    };

    const handleReset = () => {
        setSubmitted(false);
        setFormData({
            consentimiento: "", edad: "", genero: "", carrera: "", anio: "", situacionLaboral: "", comentarios: "", titulado: "No",
            ...Object.fromEntries(GAD7_QUESTIONS.map((_, i) => [`gad7_${i}`, ""])),
            ...Object.fromEntries(RELACION_QUESTIONS.map((_, i) => [`relacion_${i}`, ""])),
            ...Object.fromEntries(PERCEPCION_QUESTIONS.map((_, i) => [`percepcion_${i}`, ""])),
            apoyo1: "", apoyo2: ""
        });
        window.scrollTo(0, 0);
    };

    if (submitted) {
        if (formData.consentimiento === "No") {
            return (
                <div className="min-h-screen bg-[#f0ebf8] py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
                    <div className="w-full max-w-3xl bg-white border-t-8 border-purple-700 rounded-lg shadow-md p-8 text-center">
                        <h1 className="text-3xl font-semibold text-gray-800 mb-4">Has decidido no participar</h1>
                        <p className="text-gray-600 mb-6">Respetamos tu decisión. La información no ha sido recopilada. ¡Gracias por tu tiempo!</p>
                        <button onClick={handleReset} className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded transition duration-200">Volver al inicio</button>
                    </div>
                </div>
            );
        }

        const gad7Score = calculateGAD7Score();
        const gad7Result = getGAD7Interpretation(gad7Score);

        return (
            <div className="min-h-screen bg-[#f0ebf8] py-10 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white border-t-8 border-purple-700 rounded-lg shadow-md p-8 mb-6">
                        <h1 className="text-3xl font-semibold text-gray-800 mb-2">¡Gracias por tus respuestas!</h1>
                        <p className="text-gray-600">A continuación, se muestra un resumen de tu participación y el resultado de la escala aplicada.</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Resultado Escala GAD-7 (Ansiedad)</h2>
                        <div className={`p-4 rounded-md mb-4 ${gad7Result.bg}`}>
                            <p className="text-lg text-gray-800">Tu puntaje es: <strong>{gad7Score} / 21</strong></p>
                            <p className={`text-xl font-bold mt-1 ${gad7Result.color}`}>Nivel indicado: {gad7Result.level}</p>
                        </div>
                        <p className="text-sm text-gray-500 italic">*Nota: Este resultado es orientativo y no constituye un diagnóstico clínico. Si sientes que la ansiedad afecta tu bienestar, te recomendamos buscar apoyo profesional.</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Resumen de Datos Generales</h2>
                        <ul className="space-y-2 text-gray-700">
                            <li><strong>Edad:</strong> {formData.edad}</li>
                            <li><strong>Género:</strong> {formData.genero}</li>
                            <li><strong>¿Se encuentra titulado/a?:</strong> {formData.titulado}</li>
                            <li><strong>Escuela:</strong> {formData.carrera}</li>
                            {formData.titulado === "No" && <li><strong>Año académico:</strong> {formData.anio ? (formData.anio.includes('año') ? formData.anio : `${formData.anio}° año`) : ""}</li>}
                            <li><strong>Situación Ocupacional:</strong> {formData.situacionLaboral}</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tus respuestas detalladas</h2>
                        
                        <h3 className="font-semibold text-purple-700 mt-4 mb-2">Ansiedad, Alimentación y Bienestar</h3>
                        <ul className="space-y-3 text-sm text-gray-700">
                            {RELACION_QUESTIONS.map((q, i) => (
                                <li key={i} className="bg-gray-50 p-3 rounded border border-gray-100">
                                    <div className="font-medium mb-1">{q}</div>
                                    <div className="text-purple-600 font-semibold">{formData[`relacion_${i}`]}</div>
                                </li>
                            ))}
                        </ul>

                        <h3 className="font-semibold text-purple-700 mt-6 mb-2">Percepción sobre Salud Mental</h3>
                        <ul className="space-y-3 text-sm text-gray-700">
                            {PERCEPCION_QUESTIONS.map((q, i) => (
                                <li key={i} className="bg-gray-50 p-3 rounded border border-gray-100">
                                    <div className="font-medium mb-1">{q}</div>
                                    <div className="text-purple-600 font-semibold">{formData[`percepcion_${i}`]}</div>
                                </li>
                            ))}
                        </ul>

                        <h3 className="font-semibold text-purple-700 mt-6 mb-2">Apoyo y Bienestar</h3>
                        <ul className="space-y-3 text-sm text-gray-700">
                            <li className="bg-gray-50 p-3 rounded border border-gray-100">
                                <div className="font-medium mb-1">¿Buscarías apoyo psicológico si sintieras que tu ansiedad o relación con la alimentación afecta tu bienestar?</div>
                                <div className="text-purple-600 font-semibold">{formData.apoyo1}</div>
                            </li>
                            <li className="bg-gray-50 p-3 rounded border border-gray-100">
                                <div className="font-medium mb-1">¿Te gustaría que las instituciones educativas entregaran más apoyo relacionado con salud mental y bienestar estudiantil?</div>
                                <div className="text-purple-600 font-semibold">{formData.apoyo2}</div>
                            </li>
                        </ul>
                        {formData.comentarios && (
                            <div className="bg-purple-50/50 p-3 rounded border border-purple-100 text-sm mt-4">
                                <div className="font-semibold text-purple-700 text-xs mb-1 uppercase tracking-wider">Comentarios o Sugerencias Adicionales</div>
                                <div className="text-purple-900 font-semibold">{formData.comentarios}</div>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-8 pb-10">
                        <button onClick={handleReset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded transition duration-200">Realizar nueva encuesta</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f0ebf8] py-8 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit}>
                    
                    {/* Header Section */}
                    <div className="bg-white border-t-8 border-purple-700 rounded-lg shadow-md p-6 sm:p-8 mb-4">
                        <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 mb-3">Mente, Cuerpo y Aula</h1>
                        <h2 className="text-lg text-gray-700 mb-4 font-medium">Encuesta sobre ansiedad, alimentación y rendimiento estudiantil</h2>
                        <hr className="mb-4 border-gray-200" />
                        <h3 className="font-bold text-gray-800 mb-2">CONSENTIMIENTO INFORMADO</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-4">
                            Esta encuesta tiene fines exclusivamente académicos y de investigación estudiantil. La información recopilada será anónima y confidencial. Los resultados no constituyen un diagnóstico médico ni psicológico. La participación es voluntaria.
                        </p>
                        <p className="text-red-500 text-sm font-medium">* Indica que la pregunta es obligatoria</p>
                    </div>

                    {/* Consentimiento */}
                    <QuestionCard title="¿Acepta participar en esta encuesta?">
                        <RadioGroup 
                            name="consentimiento" 
                            options={["Sí", "No"]} 
                            formData={formData}
                            handleChange={handleChange}
                        />
                    </QuestionCard>

                    {/* Condicional: Mostrar resto del formulario solo si no rechaza participar */}
                    {formData.consentimiento !== "No" && (
                        <>
                            {/* Datos Generales */}
                            <div className="bg-purple-700 text-white p-3 rounded-t-lg mt-6 shadow-sm">
                                <h2 className="text-lg font-semibold ml-2">DATOS GENERALES</h2>
                            </div>
                            
                            <QuestionCard title="Edad">
                                <input 
                                    type="number" 
                                    name="edad" 
                                    value={formData.edad} 
                                    onChange={handleChange} 
                                    required
                                    min="10"
                                    max="100"
                                    placeholder="Tu respuesta"
                                    className="w-full sm:w-1/2 border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent"
                                />
                            </QuestionCard>

                            <QuestionCard title="Género">
                                <RadioGroup 
                                    name="genero" 
                                    options={["Femenino", "Masculino", "No binario", "Prefiero no responder", "Otro"]} 
                                    formData={formData}
                                    handleChange={handleChange}
                                />
                            </QuestionCard>

                            <QuestionCard title="Escuela">
                                <select 
                                    name="carrera" 
                                    value={formData.carrera} 
                                    onChange={handleChange} 
                                    required
                                    className="w-full sm:w-2/3 border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent"
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
                                    formData={formData}
                                    handleChange={handleChange}
                                />
                            </QuestionCard>

                            {formData.titulado === "No" && (
                                <QuestionCard title="Año académico">
                                    <input 
                                        type="number" 
                                        name="anio" 
                                        value={formData.anio} 
                                        onChange={handleChange} 
                                        required={formData.titulado === "No"}
                                        min="1"
                                        max="10"
                                        placeholder="Tu respuesta (ej: 1, 2, 3...)"
                                        className="w-full sm:w-1/2 border-b-2 border-gray-300 focus:border-purple-600 outline-none pb-1 pt-2 transition duration-200 text-gray-800 bg-transparent"
                                    />
                                </QuestionCard>
                            )}

                            <QuestionCard title="Situación Ocupacional">
                                <RadioGroup 
                                    name="situacionLaboral" 
                                    options={["Solo estudia", "Estudia y trabaja", "Solo trabaja"]} 
                                    formData={formData}
                                    handleChange={handleChange}
                                />
                            </QuestionCard>

                            {/* GAD-7 */}
                            <div className="bg-purple-700 text-white p-3 rounded-t-lg mt-6 shadow-sm">
                                <h2 className="text-lg font-semibold ml-2">ESCALA GAD-7</h2>
                            </div>
                            <div className="bg-white rounded-b-lg shadow-sm border-x border-b border-gray-200 p-6 mb-4">
                                <p className="text-gray-700 font-medium mb-2">Durante las últimas 2 semanas, ¿con qué frecuencia ha experimentado las siguientes situaciones?</p>
                            </div>

                            {}
                            {GAD7_QUESTIONS.map((q, i) => (
                                <QuestionCard key={i} title={q}>
                                    <RadioGroup 
                                        name={`gad7_${i}`} 
                                        options={GAD7_OPTIONS} 
                                        formData={formData}
                                        handleChange={handleChange}
                                    />
                                </QuestionCard>
                            ))}

                            {/* Relación Ansiedad / Alimentación */}
                            <div className="bg-purple-700 text-white p-3 rounded-t-lg mt-6 shadow-sm">
                                <h2 className="text-lg font-semibold ml-2">RELACIÓN ENTRE ANSIEDAD, ALIMENTACIÓN Y BIENESTAR</h2>
                            </div>
                            
                            {RELACION_QUESTIONS.map((q, i) => (
                                <QuestionCard key={i} title={q}>
                                    <RadioGroup 
                                        name={`relacion_${i}`} 
                                        options={RELACION_OPTIONS} 
                                        formData={formData}
                                        handleChange={handleChange}
                                    />
                                </QuestionCard>
                            ))}

                            {/* Percepción */}
                            <div className="bg-purple-700 text-white p-3 rounded-t-lg mt-6 shadow-sm">
                                <h2 className="text-lg font-semibold ml-2">PERCEPCIÓN SOBRE SALUD MENTAL Y TRASTORNOS ALIMENTARIOS</h2>
                            </div>
                            
                            {}
                            {PERCEPCION_QUESTIONS.map((q, i) => (
                                <QuestionCard key={i} title={q}>
                                    <RadioGroup 
                                        name={`percepcion_${i}`} 
                                        options={PERCEPCION_OPTIONS} 
                                        formData={formData}
                                        handleChange={handleChange}
                                    />
                                </QuestionCard>
                            ))}

                            {/* Apoyo y Bienestar */}
                            <div className="bg-purple-700 text-white p-3 rounded-t-lg mt-6 shadow-sm">
                                <h2 className="text-lg font-semibold ml-2">APOYO Y BIENESTAR</h2>
                            </div>

                            <QuestionCard title="¿Buscarías apoyo psicológico si sintieras que tu ansiedad o relación con la alimentación afecta tu bienestar?">
                                <RadioGroup 
                                    name="apoyo1" 
                                    options={["Sí", "No", "No estoy seguro/a"]} 
                                    formData={formData}
                                    handleChange={handleChange}
                                />
                            </QuestionCard>

                            <QuestionCard title="¿Te gustaría que las instituciones educativas entregaran más apoyo relacionado con salud mental y bienestar estudiantil?">
                                <RadioGroup 
                                    name="apoyo2" 
                                    options={["Sí", "No", "Tal vez"]} 
                                    formData={formData}
                                    handleChange={handleChange}
                                />
                            </QuestionCard>

                            {}
                            {/* Sección opcional de comentarios al final de todo el formulario */}
                            <div className="mt-8">
                                <QuestionCard title="¿Deseas agregar algún comentario o sugerencia adicional?" isRequired={false}>
                                    <textarea
                                        name="comentarios"
                                        value={formData.comentarios}
                                        onChange={handleChange}
                                        maxLength={2000}
                                        placeholder="Si tienes alguna duda, sugerencia o comentario sobre la encuesta, escríbelo aquí..."
                                        rows={4}
                                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:border-purple-600 transition duration-200 text-gray-800 bg-transparent"
                                    />
                                    <div className="text-right text-xs text-gray-400 mt-1">
                                        {formData.comentarios.length} / 2000 caracteres
                                    </div>
                                </QuestionCard>
                            </div>

                            <div className="flex justify-between items-center mt-8 mb-12">
                                <button 
                                    type="submit" 
                                    className="bg-purple-700 hover:bg-purple-800 text-white font-medium py-2.5 px-8 rounded shadow-md transition duration-200"
                                >
                                    Enviar
                                </button>
                                <span className="text-xs text-gray-400">Nunca envíes contraseñas a través de este formulario.</span>
                            </div>
                        </>
                    )}
                    
                    {/* Si responden NO al consentimiento pero quieren enviar la negativa */}
                    {formData.consentimiento === "No" && (
                        <div className="mt-6 mb-12 text-center sm:text-left">
                            <button 
                                type="submit" 
                                className="bg-purple-700 hover:bg-purple-800 text-white font-medium py-2.5 px-8 rounded shadow-md transition duration-200"
                            >
                                Finalizar y Enviar
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}