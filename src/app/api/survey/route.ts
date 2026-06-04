import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const GAD7_QUESTIONS = [
    "1. Sentirse nervioso/a, intranquilo/a o con los nervios de punta.",
    "2. No poder dejar de preocuparse o no poder controlar la preocupación.",
    "3. Preocuparse demasiado por diferentes cosas.",
    "4. Dificultad para relajarse.",
    "5. Estar tan inquieto/a que es difícil permanecer sentado/a tranquilamente.",
    "6. Molestarse o ponerse irritable fácilmente.",
    "7. Sentir miedo como si algo terrible pudiera pasar."
];

const RELACION_QUESTIONS = [
    "1. ¿Has sentido que comes grandes cantidades de comida en poco tiempo, acompañado de una sensación de pérdida de control?",
    "2. ¿Has presentado molestias físicas (dolor estomacal, náuseas, falta de apetito o malestar digestivo) en períodos de estrés, ansiedad o preocupación académica?",
    "3. ¿Te has sentido preocupado/a por tu peso o apariencia física al punto de afectar tu bienestar emocional?",
    "4. ¿Has cambiado tus hábitos alimentarios durante períodos de estrés académico?",
    "5. ¿Has tenido dificultades para dormir debido a preocupaciones académicas o personales?",
    "6. ¿Sientes que la ansiedad ha afectado tu rendimiento académico o concentración?"
];

const PERCEPCION_QUESTIONS = [
    "1. ¿Consideras que trastornos como la anorexia, bulimia o el trastorno por atracón afectan significativamente la salud mental y la vida académica de una persona?",
    "2. ¿Crees que existe suficiente información y apoyo sobre salud mental en el entorno estudiantil?",
    "3. ¿Consideras importante hablar sobre salud mental y alimentación en instituciones educativas?"
];

// Estructura de preguntas por defecto para sembrar (flagship GAD-7)
const FLAGSHIP_PREGUNTAS = [
    // GAD-7
    ...GAD7_QUESTIONS.map((q, i) => ({
        id: `gad7_${i}`,
        titulo: q,
        seccion: "ESCALA GAD-7 (Ansiedad en las últimas 2 semanas)",
        tipo: "opcion_unica",
        opciones: ["Nunca", "Varios días", "Más de la mitad de los días", "Casi todos los días"],
        requerida: true
    })),
    // Relación
    ...RELACION_QUESTIONS.map((q, i) => ({
        id: `relacion_${i}`,
        titulo: q,
        seccion: "RELACIÓN ENTRE ANSIEDAD, ALIMENTACIÓN Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: ["Nunca", "Rara vez", "A veces", "Frecuentemente", "Muy frecuentemente"],
        requerida: true
    })),
    // Percepción
    ...PERCEPCION_QUESTIONS.map((q, i) => ({
        id: `percepcion_${i}`,
        titulo: q,
        seccion: "PERCEPCIÓN SOBRE SALUD MENTAL Y TRASTORNOS ALIMENTARIOS",
        tipo: "opcion_unica",
        opciones: ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"],
        requerida: true
    })),
    // Apoyo
    {
        id: "apoyo1",
        titulo: "¿Buscarías apoyo psicológico si sintieras que tu ansiedad o relación con la alimentación afecta tu bienestar?",
        seccion: "APOYO Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: ["Sí", "No", "No estoy seguro/a"],
        requerida: true
    },
    {
        id: "apoyo2",
        titulo: "¿Te gustaría que las instituciones educativas entregaran más apoyo relacionado con salud mental y bienestar estudiantil?",
        seccion: "APOYO Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: ["Sí", "No", "Tal vez"],
        requerida: true
    },
    // Preguntas adicionales solicitadas
    {
        id: "relacion_6",
        titulo: "Ante la presión académica, ¿priorizas el rendimiento inmediato (nota/entrega) sobre la satisfacción de tus necesidades fisiológicas básicas (comer, dormir, hidratarse)?",
        seccion: "RELACIÓN ENTRE ANSIEDAD, ALIMENTACIÓN Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: ["Siempre", "Frecuentemente", "A veces", "Rara vez", "Nunca"],
        requerida: true
    },
    {
        id: "relacion_7",
        titulo: "Al identificar un aumento en tus niveles de ansiedad, ¿qué conducta realizas primero?",
        seccion: "RELACIÓN ENTRE ANSIEDAD, ALIMENTACIÓN Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: [
            "Aumentar la ingesta de alimentos (picoteo)", 
            "Suprimir la ingesta (pérdida de apetito)", 
            "Aumentar el consumo de estimulantes (café/bebidas)", 
            "Realizar actividad física", 
            "Aislarme y dejar de comer"
        ],
        requerida: true
    },
    {
        id: "relacion_8",
        titulo: "¿Con qué frecuencia experimentas síntomas físicos que asocias directamente a la carga académica? (Gastritis, tensión muscular, cefaleas, taquicardia).",
        seccion: "RELACIÓN ENTRE ANSIEDAD, ALIMENTACIÓN Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: ["Siempre", "Frecuentemente", "A veces", "Rara vez", "Nunca"],
        requerida: true
    },
    {
        id: "relacion_9",
        titulo: "¿Sientes que tu nivel de energía es suficiente para cumplir con tus obligaciones académicas sin depender de estimulantes (café, bebidas energéticas, fármacos)?",
        seccion: "RELACIÓN ENTRE ANSIEDAD, ALIMENTACIÓN Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: ["Siempre", "Frecuentemente", "A veces", "Rara vez", "Nunca"],
        requerida: true
    },
    {
        id: "percepcion_3",
        titulo: "¿Sientes que en tu carrera existe una cultura donde \"aguantar hambre o sueño\" es visto como parte del compromiso académico?",
        seccion: "PERCEPCIÓN SOBRE SALUD MENTAL Y TRASTORNOS ALIMENTARIOS",
        tipo: "opcion_unica",
        opciones: ["Sí", "No", "Tal vez"],
        requerida: true
    },
    {
        id: "apoyo3",
        titulo: "Si tuvieras que priorizar, ¿qué pondrías primero: el rendimiento académico (calificaciones) o tu salud física/mental?",
        seccion: "APOYO Y BIENESTAR",
        tipo: "opcion_unica",
        opciones: ["Rendimiento académico (calificaciones)", "Tu salud física/mental", "Ambos por igual"],
        requerida: true
    }
];

// Inicializar tablas y autosembrar si están vacías
async function ensureDbInitialized() {
    try {
        // 1. Crear tablas
        await sql`
            CREATE TABLE IF NOT EXISTS encuestas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                titulo VARCHAR(255) NOT NULL,
                descripcion TEXT,
                slug VARCHAR(255) UNIQUE NOT NULL,
                activa BOOLEAN DEFAULT TRUE NOT NULL,
                preguntas JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        `;

        // Asegurar que la columna 'categoria' existe (para compatibilidad en caliente)
        await sql`
            ALTER TABLE encuestas ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) DEFAULT 'General' NOT NULL;
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS respuestas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                encuesta_id UUID REFERENCES encuestas(id) ON DELETE CASCADE,
                consentimiento VARCHAR(10) NOT NULL CHECK (consentimiento = 'Sí'),
                datos_generales JSONB NOT NULL,
                respuestas_preguntas JSONB NOT NULL,
                gad7_score INTEGER,
                gad7_level VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        `;

        // Índices
        await sql`CREATE INDEX IF NOT EXISTS idx_encuestas_slug ON encuestas(slug);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_encuestas_categoria ON encuestas(categoria);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_id ON respuestas(encuesta_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_respuestas_created_at ON respuestas(created_at);`;

        // 2. Autosembrar la encuesta Flagship si está vacía, o actualizarla si ya existe
        const surveyCountResult = await sql`SELECT COUNT(*) as count FROM encuestas;`;
        const count = parseInt(surveyCountResult.rows[0].count || '0');
        const defaultPreguntasJson = JSON.stringify(FLAGSHIP_PREGUNTAS);

        if (count === 0) {
            await sql`
                INSERT INTO encuestas (titulo, descripcion, categoria, slug, activa, preguntas)
                VALUES (
                    'Mente, Cuerpo y Aula',
                    'Encuesta sobre ansiedad, alimentación y rendimiento estudiantil en la educación superior.',
                    'Salud Mental y Bienestar',
                    'mente-cuerpo-y-aula',
                    true,
                    ${defaultPreguntasJson}
                );
            `;
            console.log("Encuesta Flagship 'Mente, Cuerpo y Aula' sembrada con éxito en la base de datos.");
        } else {
            await sql`
                UPDATE encuestas 
                SET preguntas = ${defaultPreguntasJson} 
                WHERE slug = 'mente-cuerpo-y-aula';
            `;
            console.log("Estructura de la encuesta flagship 'Mente, Cuerpo y Aula' actualizada con éxito en la base de datos.");
        }
    } catch (err) {
        console.error("Error al inicializar la base de datos:", err);
        throw err;
    }
}

// OBTENER ESTRUCTURA DE UNA ENCUESTA O LISTA DE ENCUESTAS ACTIVAS
export async function GET(request: Request) {
    try {
        await ensureDbInitialized();

        const { searchParams } = new URL(request.url);
        const list = searchParams.get('list');

        if (list === 'active') {
            const result = await sql`
                SELECT id, titulo, slug, categoria 
                FROM encuestas 
                WHERE activa = true 
                ORDER BY created_at DESC;
            `;
            return NextResponse.json({
                success: true,
                surveys: result.rows
            });
        }

        const slug = searchParams.get('slug') || 'mente-cuerpo-y-aula';

        const result = await sql`
            SELECT id, titulo, descripcion, slug, activa, preguntas 
            FROM encuestas 
            WHERE slug = ${slug} LIMIT 1;
        `;

        if (result.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: `No se encontró la encuesta con el enlace: '${slug}'`
            }, { status: 404 });
        }

        const survey = result.rows[0];

        if (!survey.activa) {
            return NextResponse.json({
                success: false,
                error: "Esta encuesta se encuentra temporalmente inactiva o cerrada por el administrador.",
                survey: { titulo: survey.titulo }
            }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            survey
        });

    } catch (error: any) {
        console.error("Error al obtener encuesta:", error);
        return NextResponse.json({
            success: false,
            error: "Error de conexión o la base de datos no está disponible.",
            details: error.message
        }, { status: 500 });
    }
}

// ENVIAR RESPUESTA A UNA ENCUESTA
export async function POST(request: Request) {
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const {
            encuestaId,
            consentimiento,
            datosGenerales, // {edad, genero, carrera, anio}
            respuestasPreguntas // {"gad7_0": "Nunca", ...}
        } = body;

        if (!encuestaId || !consentimiento) {
            return NextResponse.json({
                success: false,
                error: "Falta el ID de la encuesta o el consentimiento de participación."
            }, { status: 400 });
        }

        // Validación ética: Si declinan participar, devolvemos éxito pero sin guardar nada en BD
        if (consentimiento === "No") {
            return NextResponse.json({
                success: true,
                message: "Has decidido no participar. Respetamos tu decisión, no se guardaron datos.",
                score: null,
                level: "No participado"
            });
        }

        if (!datosGenerales || !datosGenerales.edad || !datosGenerales.genero || !datosGenerales.carrera || !datosGenerales.anio) {
            return NextResponse.json({
                success: false,
                error: "Faltan rellenar los datos demográficos obligatorios."
            }, { status: 400 });
        }

        // Determinar si aplica el cálculo de GAD-7 (Ansiedad)
        // Se calcula si las 7 preguntas están presentes en las respuestas
        let gad7Score: number | null = null;
        let gad7Level: string | null = null;

        let hasAllGad7 = true;
        let tempScore = 0;
        for (let i = 0; i < 7; i++) {
            const ans = respuestasPreguntas[`gad7_${i}`];
            if (ans === undefined) {
                hasAllGad7 = false;
                break;
            }
            if (ans === "Varios días") tempScore += 1;
            if (ans === "Más de la mitad de los días") tempScore += 2;
            if (ans === "Casi todos los días") tempScore += 3;
        }

        if (hasAllGad7) {
            gad7Score = tempScore;
            if (gad7Score >= 0 && gad7Score <= 4) gad7Level = "Ansiedad mínima";
            else if (gad7Score >= 5 && gad7Score <= 9) gad7Level = "Ansiedad leve";
            else if (gad7Score >= 10 && gad7Score <= 14) gad7Level = "Ansiedad moderada";
            else if (gad7Score >= 15) gad7Level = "Ansiedad severa";
        }

        // Insertar respuesta en formato JSONB
        const datosGeneralesJson = JSON.stringify(datosGenerales);
        const respuestasPreguntasJson = JSON.stringify(respuestasPreguntas);

        await sql`
            INSERT INTO respuestas (
                encuesta_id,
                consentimiento,
                datos_generales,
                respuestas_preguntas,
                gad7_score,
                gad7_level
            ) VALUES (
                ${encuestaId},
                ${consentimiento},
                ${datosGeneralesJson},
                ${respuestasPreguntasJson},
                ${gad7Score},
                ${gad7Level}
            );
        `;

        return NextResponse.json({
            success: true,
            message: "¡Muchas gracias! Respuestas guardadas en la plataforma de manera segura.",
            score: gad7Score,
            level: gad7Level
        });

    } catch (error: any) {
        console.error("Error al procesar envío de respuestas:", error);
        
        if (error.message && (error.message.includes("relation") || error.message.includes("ENOTFOUND") || error.message.includes("connection"))) {
            return NextResponse.json({
                success: false,
                error: "Error de base de datos. Por favor enlaza tu base de datos de Vercel Postgres.",
                details: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: false,
            error: "Error interno al registrar las respuestas.",
            details: error.message
        }, { status: 500 });
    }
}
